# React example

`<lucid-button>` fires a native `click` event. Both React 19 and React 17/18 hand plain `onClick={...}` directly through to the DOM, so no wrapper is needed for a button.

## Install

```sh
bun add @mind-matrix/lucid-components
```

## Use

```tsx
import "@mind-matrix/lucid-components";

<lucid-button variant="primary" onClick={() => …}>
  Save
</lucid-button>
```

## When you'd still reach for `@mind-matrix/lucid-react`

The wrapper package exists for components that dispatch *custom* events (`lucid-select`, `lucid-close`, etc). React 17/18 don't bind non-DOM event names automatically. Buttons don't need it.
