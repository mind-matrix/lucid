# @mind-matrix/lucid-react

React interop helpers for [Lucid components](https://www.npmjs.com/package/@mind-matrix/lucid-components).

## When you need this

**Most people don't.** Lucid components dispatch native DOM events (`click`, `focus`, `keydown`), which React handles via `onClick`, `onFocus`, `onKeyDown` in every version from 17 through 19 — no wrapper needed.

**Reach for this package when** you're on **React 17 or 18** and consuming a Lucid component that dispatches a **custom event** — React <19 doesn't automatically forward `on<CustomEvent>` props to `addEventListener`, and this package's `createComponent()` bridges that.

React 19+ handles custom events natively, so on React 19 this package is a no-op.

## Install

```sh
bun add @mind-matrix/lucid-react
```

## Documentation

`createComponent()` API reference, typed-wrapper examples: **<https://mind-matrix.github.io/lucid>**

## License

MIT
