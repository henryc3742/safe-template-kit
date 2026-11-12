// Core of safe-template-kit.
//
// Design decision: placeholders are written as `{{name}}` and are resolved
// against a flat object of values. Resolution is a single, non-recursive
// lookup. We deliberately do NOT support expressions, filters, pipes, nested
// property paths, or partials. The whole point of the library is that the
// template text can never cause code to run, so the resolver only ever reads
// a property off a plain object. If a value is a function it is called with
// NO arguments -- that is the only "execution" we allow, and it is opt-in by
// whoever built the data object. A template author cannot reach a function
// that was not already handed to render().
//
// Second decision: an unknown or missing placeholder is an error, not an
// empty string. Silently rendering `{{typo}}` as "" hides bugs at the call
// site; throwing TemplateError makes the mistake loud. Callers who want a
// blank for a missing key can pass `undefined` explicitly.

const OPEN = '{{';
const CLOSE = '}}';

/**
 * Thrown for every failure mode of render(): malformed template syntax,
 * missing keys, and values that cannot be stringified.
 */
export class TemplateError extends Error {
  constructor(message) {
    super(message);
    this.name = 'TemplateError';
  }
}

// Normalise a lookup key. Keys are compared exactly, but we reject the
// whitespace-only case early so that `{{ }}` produces a clear message rather
// than a confusing "no such key: ' '".
function parseKey(raw) {
  const key = raw.trim();
  if (key === '') {
    throw new TemplateError('empty placeholder name');
  }
  return key;
}

// Convert a resolved value to text. `null` and `undefined` are treated as the
// empty string only when the caller supplied them explicitly; a key that was
// never supplied never reaches this function because lookup throws first.
function stringify(value, key) {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'function') {
    // Call with no arguments. This is the documented escape hatch for lazy
    // values; it cannot be used to smuggle arguments or `this`.
    return stringify(value(), key);
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'bigint' || typeof value === 'boolean') {
    return String(value);
  }
  throw new TemplateError(
    `cannot render value for {{${key}}}: expected string, number, bigint, boolean, null, undefined, or function, got ${typeof value}`
  );
}

// Read a key off the data object without walking the prototype chain. This is
// what makes prototype pollution impossible: `{{constructor}}` on a plain
// object is a missing key, not Object's constructor.
function lookup(data, key) {
  if (data === null || typeof data !== 'object') {
    throw new TemplateError(`data must be an object, got ${data === null ? 'null' : typeof data}`);
  }
  if (!Object.prototype.hasOwnProperty.call(data, key)) {
    throw new TemplateError(`no such key: ${key}`);
  }
  return data[key];
}

/**
 * Render `template` by substituting `{{key}}` placeholders from `data`.
 *
 * @param {string} template - the template text.
 * @param {object} data - own-property bag of values keyed by placeholder name.
 * @returns {string} the rendered result.
 * @throws {TemplateError} on malformed syntax, missing keys, or bad values.
 */
export function render(template, data) {
  if (typeof template !== 'string') {
    throw new TemplateError(`template must be a string, got ${typeof template}`);
  }

  let out = '';
  let i = 0;

  while (i < template.length) {
    const open = template.indexOf(OPEN, i);
    if (open === -1) {
      out += template.slice(i);
      break;
    }

    out += template.slice(i, open);

    const close = template.indexOf(CLOSE, open + OPEN.length);
    if (close === -1) {
      // An opening delimiter with no closer is a syntax error. Treating the
      // rest of the template as literal text would make a typo invisible.
      throw new TemplateError(`unclosed placeholder at index ${open}`);
    }

    const rawKey = template.slice(open + OPEN.length, close);
    const key = parseKey(rawKey);
    out += stringify(lookup(data, key), key);
    i = close + CLOSE.length;
  }

  return out;
}
