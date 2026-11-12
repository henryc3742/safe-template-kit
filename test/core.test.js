import { test } from 'node:test';
import assert from 'node:assert/strict';

import { render, TemplateError } from '../src/index.js';

test('renders a simple placeholder', () => {
  assert.equal(render('hello {{name}}', { name: 'world' }), 'hello world');
});

test('renders adjacent placeholders with no separator', () => {
  assert.equal(render('{{a}}{{b}}', { a: '1', b: '2' }), '12');
});

test('renders an empty template unchanged', () => {
  assert.equal(render('', {}), '');
});

test('renders a template with no placeholders unchanged', () => {
  assert.equal(render('just text', {}), 'just text');
});

test('trims whitespace inside the delimiters', () => {
  assert.equal(render('{{ name }}', { name: 'x' }), 'x');
});

test('renders numbers, booleans and bigints', () => {
  assert.equal(render('{{n}} {{b}} {{g}}', { n: 42, b: false, g: 10n }), '42 false 10');
});

test('renders explicit null and undefined as empty strings', () => {
  assert.equal(render('[{{x}}]', { x: null }), '[]');
  assert.equal(render('[{{x}}]', { x: undefined }), '[]');
});

test('calls function values with no arguments', () => {
  let called = 0;
  const data = {
    f: (...args) => {
      called += 1;
      assert.equal(args.length, 0);
      return 'lazy';
    },
  };
  assert.equal(render('{{f}}', data), 'lazy');
  assert.equal(called, 1);
});

test('rejects a missing key', () => {
  assert.throws(() => render('{{missing}}', {}), (err) => {
    assert.ok(err instanceof TemplateError);
    assert.match(err.message, /no such key: missing/);
    return true;
  });
});

test('does not read inherited properties', () => {
  const data = Object.create({ inherited: 'nope' });
  assert.throws(() => render('{{inherited}}', data), TemplateError);
});

// `{{constructor}}` on a plain object is a classic prototype-pollution probe.
// Because lookup uses hasOwnProperty, it is a missing key, not Object's ctor.
test('does not resolve prototype members like constructor', () => {
  assert.throws(() => render('{{constructor}}', {}), TemplateError);
});

test('rejects an unclosed placeholder', () => {
  assert.throws(() => render('a {{b', {}), (err) => {
    assert.ok(err instanceof TemplateError);
    assert.match(err.message, /unclosed placeholder/);
    return true;
  });
});

test('rejects an empty placeholder name', () => {
  assert.throws(() => render('{{}}', {}), TemplateError);
  assert.throws(() => render('{{   }}', {}), TemplateError);
});

test('rejects a value that cannot be stringified', () => {
  assert.throws(() => render('{{o}}', { o: {} }), (err) => {
    assert.ok(err instanceof TemplateError);
    assert.match(err.message, /cannot render value/);
    return true;
  });
});

test('rejects a non-string template', () => {
  assert.throws(() => render(42, {}), TemplateError);
});

test('rejects a non-object data bag', () => {
  assert.throws(() => render('{{x}}', null), TemplateError);
  assert.throws(() => render('{{x}}', 'nope'), TemplateError);
});

// Delimiters inside the value are not re-scanned: one pass, no recursion.
test('does not re-render delimiters that came from a value', () => {
  assert.equal(render('{{a}}', { a: '{{b}}' }), '{{b}}');
});

test('handles a lone closing delimiter as literal text', () => {
  assert.equal(render('a }} b', {}), 'a }} b');
});

test('handles repeated placeholders', () => {
  assert.equal(render('{{x}}-{{x}}-{{x}}', { x: 'v' }), 'v-v-v');
});
