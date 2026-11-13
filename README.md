# safe-template-kit

Renders `{{key}}` placeholders from a plain object, with no way for the template text to execute code.

```js
import { render, TemplateError } from 'safe-template-kit';

const out = render('Hello, {{name}}! You have {{count}} messages.', {
  name: 'Ada',
  count: 3,
});
// => 'Hello, Ada! You have 3 messages.'

try {
  render('{{missing}}', {});
} catch (err) {
  if (err instanceof TemplateError) {
    console.error(err.message); // 'no such key: missing'
  }
}
```

## Why this exists

Most template helpers either evaluate an expression (`{{ user.name.toUpperCase() }}`) or
quietly render missing values as the empty string. Both are problems when the template is
untrusted or authored by someone other than the caller. Expression evaluation is a code
execution surface; silent blanks turn a typo into a production incident.

This library takes the narrow reading: a placeholder is exactly one key, looked up as an
own property of the supplied object. Anything else -- nested paths, filters, arithmetic,
conditionals -- is out of scope. The trade-off is expressiveness. If you need a computed
value, compute it at the call site and pass it in; the template stays inert.

The one deliberate escape hatch is that a value may be a function, which is called with no
arguments and whose return value is stringified. That is opt-in by whoever builds the data
object, and it cannot be used to pass arguments or a `this` binding.

## Behaviour

- `render(template, data)` returns a string.
- Keys are trimmed, so `{{ name }}` and `{{name}}` are the same key.
- `null` and `undefined` values render as the empty string.
- Strings, numbers, bigints and booleans render as you would expect.
- Any other value type raises `TemplateError` rather than stringifying to `[object Object]`.
- A missing key, an unclosed `{{`, an empty name, a non-string template, or a non-object
data bag all raise `TemplateError`.
- Lookup uses `hasOwnProperty`, so inherited members such as `constructor` are not reachable
from a template.

## The edge you will hit

Because lookup is exact, `{{user.name}}` is a single key literally named `user.name`. It
will not descend into a `user` object. Pass a flattened value (`{ 'user.name': ... }`) or
pre-compute the string. This is intentional: supporting dotted paths means inventing rules
for missing intermediate objects, and those rules are where safe template engines usually
lose their safety.

## API

- `render(template: string, data: object): string`
- `TemplateError` -- the error class thrown for every failure mode above.
