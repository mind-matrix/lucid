---
name: lucid-ui
description: Use this skill when architecting or implementing UI for a website using @mind-matrix/lucid-components — a framework-agnostic Web Component library. Trigger on requests like "build a page with lucid", "use lucid components", "integrate lucid into my Astro/React/Vue/Angular app", or when the user names any `<lucid-*>` element (button, card, nav, tabs). Ensures correct install, correct import shape, correct theming via CSS custom properties, correct a11y/i18n patterns, and correct framework-integration snippets. Skip this skill if the user is on a different UI library (Radix, MUI, Chakra, etc.) or if the request is a generic HTML/CSS question unrelated to lucid.
---

# lucid-ui

You are architecting UI using **`@mind-matrix/lucid-components`** — a framework-agnostic design system built on Web Components. Read this file end-to-end before writing code that uses `<lucid-*>` elements.

## Core mental model

Lucid components are **native custom elements**. They extend `HTMLElement`, ship as ESM, use Shadow DOM for style isolation, and dispatch native DOM events. This means:

- **No framework wrappers.** `<lucid-button>` is HTML. React, Vue, Angular, Astro, Svelte, and vanilla HTML all render it the same way.
- **No hydration.** Custom elements upgrade themselves when the browser parses `customElements.define()`. Astro's default zero-JS-by-default is fine — you just include one `<script>` tag.
- **No runtime.** The library itself has no framework dependency. Total gzipped weight for runtime + every shipped component is under 6 KB.
- **Style-isolated.** Shadow DOM prevents outer CSS from bleeding in and component CSS from bleeding out. Theming happens **only** through CSS custom properties, which cross the Shadow DOM boundary via inheritance.

## Install

Every consumer, regardless of framework:

```sh
bun add @mind-matrix/lucid-components
```

`@mind-matrix/lucid-core` is a transitive dependency — do NOT tell the user to install it separately. They only need `-core` directly if they're authoring their own Lucid-style components.

`@mind-matrix/lucid-react` is a niche interop package for React 17/18 with custom events — most React apps do NOT need it. Recommend it only when the user is on React <19 AND consuming a lucid component that dispatches a custom (non-DOM) event.

## The two-line integration

Every framework's setup boils down to:

1. Load the design tokens CSS (optional but expected for the intended look):
   ```html
   <link rel="stylesheet" href="@mind-matrix/lucid-core/tokens.css" />
   ```

2. Import the components module once at app entry (registers every `<lucid-*>` element globally):
   ```ts
   import "@mind-matrix/lucid-components";
   ```

Where you place these varies per framework — see "Framework integration" below.

## Available components

| Element | Purpose | Key props |
|---|---|---|
| `<lucid-button>` | Buttons + polymorphic anchor (when `href` set) | `variant` ("primary" \| "ghost" \| ""), `disabled`, `href`, `target`, `rel` |
| `<lucid-card>` | Container primitive | `variant` ("outlined" \| "filled" \| "elevated" \| ""), `clickable`, `disabled` |
| `<lucid-nav>` | Navigation landmark | `orientation` ("horizontal" \| "vertical"), `label` |
| `<lucid-nav-link>` | Navigation link (renders `<a>`) | `href`, `target`, `rel`, `active`, `disabled` |
| `<lucid-select>` | Single-select dropdown (ARIA select-only combobox), form-associated | `value`, `placeholder`, `label`, `name`, `required`, `open`, `disabled` |
| `<lucid-option>` | One option inside a select | `value`, `selected`, `active`, `disabled` |
| `<lucid-tabs>` | Tablist container | `value`, `orientation`, `activation` ("automatic" \| "manual"), `label` |
| `<lucid-tab>` | Single tab (goes in `slot="tab"`) | `value`, `selected`, `disabled` |
| `<lucid-tab-panel>` | Tab content panel (default slot) | `value` |

### `<lucid-button>` — usage rules

- Button firing a JS action: `<lucid-button variant="primary" onclick={fn}>Save</lucid-button>`. Uses native `click` event — works in every framework.
- Button navigating to a URL: `<lucid-button href="/somewhere">Docs</lucid-button>`. Automatically renders as `<a>` under the hood; users get real link semantics (cmd+click, right-click "copy link").
- External link: add `target="_blank"`. `rel="noopener noreferrer"` is applied automatically.
- Icon-only button MUST have `aria-label`: `<lucid-button aria-label="Close dialog">×</lucid-button>`.
- Runtime states: `button.setState(ButtonState.PENDING, { label: "Saving" })`. Only use for async actions where the button visually communicates progress.

### `<lucid-card>` — usage rules

- Default (no `variant`) is outlined — thin border on a transparent background. Good inside another elevated container.
- `variant="elevated"` — raised with a shadow. Best on plain page backgrounds. This is the default choice for hero feature grids.
- `variant="filled"` — subtle tinted background, no border. Good for grouped groups.
- `clickable` opts the card into interactive affordances (hover lift, focus ring, keyboard activation). Combine with `onclick` or an outer `<a>` if the whole card should navigate.
- Icon slot (`slot="icon"`) is optional. Title slot (`slot="title"`) is optional. Default slot is body content.

Example:

```html
<lucid-card variant="elevated">
  <div slot="icon" aria-hidden="true"><!-- icon SVG or glyph --></div>
  <h3 slot="title">Card title</h3>
  <p>Card body content.</p>
</lucid-card>
```

### `<lucid-nav>` + `<lucid-nav-link>` — usage rules

- Always set `label` on `<lucid-nav>` — screen readers announce the region using this ("Primary navigation", "Sidebar", etc.).
- `active` on a nav-link maps to `aria-current="page"` internally. Set it for the current route.
- Use `<lucid-nav-link href="...">` — NOT a nested `<a>` inside `<lucid-button>`. That would nest interactive elements and cause a11y violations.

Example:

```html
<lucid-nav label="Primary">
  <lucid-nav-link href="/">Home</lucid-nav-link>
  <lucid-nav-link href="/docs" active>Docs</lucid-nav-link>
  <lucid-nav-link href="/blog">Blog</lucid-nav-link>
</lucid-nav>
```

### `<lucid-select>` + `<lucid-option>` — usage rules

- Options are slotted light-DOM children. Pair the select's `value` with an
  option's `value` string.
- Always set `label` — it becomes the combobox's accessible name. Without it a
  screen reader announces an unlabelled combobox.
- `placeholder` shows when `value` is empty (defaults to "Select an option").
- Read the selection with `select.value`, or `select.selectedOption` for the
  matching `<lucid-option>` element. Listen for `lucid-value-change` — same
  event name as `<lucid-tabs>`, detail is `{ value }`. It fires for user
  changes only; assigning `.value` in code is silent, like native `<select>`.
- Imperative control: `show()`, `hide()`, `toggle()`.
- Focus stays on the combobox; options are never focusable. Do NOT add
  `tabindex` to options.
- The popup renders in the top layer (Popover API), so it is never clipped by
  an ancestor's `overflow: hidden` and never buried by a `z-index`. Do NOT
  add wrapper `z-index` or `position` hacks to "fix" a dropdown — they do
  nothing.

```html
<lucid-select label="Framework" value="astro">
  <lucid-option value="astro">Astro</lucid-option>
  <lucid-option value="react">React</lucid-option>
  <lucid-option value="vue" disabled>Vue</lucid-option>
</lucid-select>
```

**In forms.** `<lucid-select>` is a form-associated custom element, so with a
`name` it behaves like a native `<select>`: it submits, appears in
`FormData`, honours `form.reset()` and session restore, is switched off by an
ancestor `<fieldset disabled>`, and supports `required` through the
constraint-validation API.

```html
<form>
  <lucid-select label="Plan" name="plan" required>
    <lucid-option value="hobby">Hobby</lucid-option>
    <lucid-option value="pro">Pro</lucid-option>
  </lucid-select>
</form>
```

```ts
select.form;                    // the owning <form>, or null
select.willValidate;            // true
select.validity.valueMissing;   // true while empty and required
select.validationMessage;
select.checkValidity();
select.reportValidity();        // …and shows the browser's message
```

- Localise the "value missing" text with `data-value-missing-message` — it is
  internal chrome, so it can't come through a slot.
- `<lucid-button>` is NOT form-associated: its native `<button>` is inside a
  shadow root, so `type="submit"` does nothing. To submit from a
  `<lucid-button>`, call `form.requestSubmit()` (or use a plain
  `<button type="submit">`).
- The host reflects `data-invalid` once the user has interacted and the
  constraint still fails — a supplementary cue only. The error *text* comes
  from the platform's validation message, so don't rely on the border alone.

### `<lucid-tabs>` family — usage rules

- Tabs go in `slot="tab"`. Panels go in the default slot. Pair by matching `value` strings.
- `activation="automatic"` (default) — arrow-key focus also selects. Best for cheap panels.
- `activation="manual"` — arrow keys move focus only; user presses Enter/Space to select. Use when panels are expensive (heavy content, network fetches).
- Vertical tabs: `<lucid-tabs orientation="vertical">`. Tabs sit on the inline-start; panels fill the remaining inline space automatically.

Example:

```html
<lucid-tabs label="Documentation" value="overview" orientation="vertical">
  <lucid-tab slot="tab" value="overview">Overview</lucid-tab>
  <lucid-tab slot="tab" value="usage">Usage</lucid-tab>
  <lucid-tab-panel value="overview">
    <p>Overview content.</p>
  </lucid-tab-panel>
  <lucid-tab-panel value="usage">
    <p>Usage content.</p>
  </lucid-tab-panel>
</lucid-tabs>
```

Listen for the change event on the tabs container:

```ts
document.querySelector("lucid-tabs")?.addEventListener("lucid-value-change", (e) => {
  console.log((e as CustomEvent).detail.value);
});
```

## Theming — CSS custom properties are the only surface

There is **no `theme` prop, no theme provider, no JS theming API**. Every component reads CSS custom properties defined in `tokens.css`. Override on any ancestor and the cascade carries into every lucid component inside that subtree — Shadow DOM does not block custom-property inheritance.

Site-wide brand override:

```css
:root {
  --lucid-color-primary: #7c3aed;
  --lucid-color-primary-fg: #ffffff;
  --lucid-radius-md: 12px;
  --lucid-font-family: "Inter", sans-serif;
}
```

Region-scoped override:

```css
.marketing-hero {
  --lucid-color-primary: white;
  --lucid-color-primary-fg: black;
}
```

Per-instance override:

```html
<lucid-button style="--lucid-color-primary: hotpink">Special</lucid-button>
```

**Dark mode** is the client's decision. Lucid ships light-mode defaults only. The client picks a strategy — `prefers-color-scheme` media query, `data-theme="dark"` on `<html>`, a `.dark` class — and overrides the tokens accordingly. Do NOT invent a dark-mode API in the library; use CSS.

Common tokens (there are more — read `tokens.css` when uncertain):

- Colors: `--lucid-color-fg`, `--lucid-color-bg`, `--lucid-color-primary`, `--lucid-color-primary-fg`, `--lucid-color-muted`, `--lucid-color-border`, `--lucid-color-danger`, `--lucid-color-surface-subtle`, `--lucid-color-fg-body`
- Spacing (rem-scale): `--lucid-space-1` through `--lucid-space-20`
- Radius: `--lucid-radius-sm/md/lg/xl`
- Font: `--lucid-font-family`, `--lucid-font-size-sm/md/lg/xl`, `--lucid-font-weight-regular/medium/semibold/bold`
- Border widths: `--lucid-border-width-sm/md/lg`
- Shadows: `--lucid-shadow-sm/md/lg`

## Framework integration

### Astro

Astro is the best fit — Web Components + Astro is a natural pair.

```astro
---
// src/layouts/Base.astro
import "@mind-matrix/lucid-core/tokens.css";
---
<html>
  <head>
    <title>My site</title>
    <style>
      /* Prevent flash of unstyled custom elements */
      :not(:defined) { visibility: hidden; }
    </style>
  </head>
  <body>
    <slot />
    <script>
      import "@mind-matrix/lucid-components";
    </script>
  </body>
</html>
```

Then any `.astro`, `.md`, or `.mdx` file wrapped in the base layout can use `<lucid-*>` tags freely. Do NOT add framework integrations (`@astrojs/react` etc.) just for lucid — plain HTML works.

### React (17, 18, 19)

```tsx
// app entry
import "@mind-matrix/lucid-components";

export function App() {
  return (
    <lucid-button variant="primary" onClick={() => console.log("clicked")}>
      Save
    </lucid-button>
  );
}
```

- React 19+ handles custom elements natively.
- React 17/18 handles native DOM events (`onClick`, `onFocus`, `onKeyDown`) automatically. It only stumbles on components dispatching **custom** events — none of the currently shipped components do, so `-react` is not needed.
- Boolean/object props on React <19: pass through property binding, or install `@mind-matrix/lucid-react` and use `createComponent()`. Native strings and booleans work as attributes without wrappers.

### Vue

Add once to the Vue compiler options:

```ts
// vite.config.ts (or similar)
export default {
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag.startsWith("lucid-"),
        },
      },
    }),
  ],
};
```

Then:

```vue
<script setup lang="ts">
import "@mind-matrix/lucid-components";
</script>
<template>
  <lucid-button variant="primary" @click="onSave">Save</lucid-button>
</template>
```

`@click` maps to native `click` — no custom event names needed.

### Angular

Add `CUSTOM_ELEMENTS_SCHEMA` to any module or standalone component using `<lucid-*>`:

```ts
import { Component, CUSTOM_ELEMENTS_SCHEMA } from "@angular/core";
import "@mind-matrix/lucid-components";

@Component({
  selector: "app-root",
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <lucid-button variant="primary" (click)="onClick($event)">Save</lucid-button>
  `,
})
export class AppComponent {
  onClick(e: Event) { /* ... */ }
}
```

### Vanilla / Svelte / Solid / anything else

Nothing to configure. Import the components module, use the tags.

## Accessibility — the non-negotiables

Every lucid component ships with a WCAG 2.1 AA guarantee. When architecting with them, DO NOT break the contract:

1. **Icon-only interactive elements MUST carry `aria-label`.** Icon buttons, close buttons, icon-only nav links. Non-negotiable.
2. **Nav landmarks MUST carry a `label` prop.** Screen readers use it to distinguish multiple navigation regions.
3. **Slot text is the accessible name.** Do NOT hide the text-content of a button/nav-link if it's the only source of the label. Use `aria-label` explicitly if a visible label doesn't exist.
4. **Focus visibility is automatic.** Do NOT override `outline` or `:focus-visible` styling on components — Lucid handles it via tokens. If you want a different focus color, override `--lucid-color-primary` or expose a component-local variable.
5. **Physical CSS properties are banned in Lucid's internal CSS.** Everything uses `padding-inline-start`, `margin-block-end`, etc. — meaning `<html dir="rtl">` "just works". Do NOT add layouts around Lucid components that use `margin-left` or `text-align: right`; use logical properties.

## Internationalization

Lucid never touches text or formatting. Rules:

1. **All user-visible text goes through slots.** Never via props (`label="..."`). This lets clients pipe their i18n library's `t("...")` result into the slot with zero library coupling.
2. **Numbers/dates/currency/plurals are pre-formatted by the client.** Components display strings; they don't call `Intl` internally. Bundle stays microscopic; consumer picks any i18n stack.
3. **Component-internal chrome accepts `data-*-label` / `data-*-message` attributes** for text that cannot be slotted — a modal's ✕ close button, `<lucid-select>`'s `data-value-missing-message`. Fallback English exists only as a safety net.

Direction: `<html dir="rtl">` mirrors every layout automatically. Never manually invert layouts.

## Composition — building pages

Lucid ships **primitives**, not page templates. Do NOT build `<lucid-hero>`, `<lucid-footer>`, `<lucid-page>` etc. — those are landing-content concerns that belong in the app's markup, composing Lucid primitives.

**Right shape for a page:**

```astro
---
import Base from "../layouts/Base.astro";
---
<Base>
  <section class="hero">
    <h1>Welcome</h1>
    <p>...</p>
    <lucid-button variant="primary" href="/docs">Get started</lucid-button>
  </section>

  <section class="features">
    <h2>What we offer</h2>
    <div class="grid">
      <lucid-card variant="elevated">
        <h3 slot="title">Fast</h3>
        <p>Details.</p>
      </lucid-card>
      <!-- ... -->
    </div>
  </section>
</Base>
```

The `<section>`, `<h1>`, `<h2>`, `.hero`, `.features`, `.grid` — all plain HTML/CSS. Lucid components are the interactive/styled surfaces; the structure around them is the app.

## What NOT to do

- ❌ Don't nest interactive elements: no `<a>` inside `<lucid-button>`, no `<button>` inside `<lucid-nav-link>`. Use polymorphic props (`href` on button) instead.
- ❌ Don't invent custom event names for actions Lucid already emits as native DOM events. `<lucid-button>` fires `click` — bind to that.
- ❌ Don't hardcode colors/spacing in application CSS around Lucid components. Reference tokens (`var(--lucid-space-4)`, `var(--lucid-color-primary)`) so overrides cascade.
- ❌ Don't wrap Lucid components in framework-specific portals/wrappers unless a specific interop bug forces it. They're just DOM elements.
- ❌ Don't attempt server-side rendering of Lucid's Shadow DOM contents. SSR renders the light DOM tags; Shadow DOM populates in the browser on custom-element upgrade. This is by design.
- ❌ Don't use `<lucid-*>` component names for anything else — the `lucid-` prefix is reserved for the library.

## When the user asks for something not shipped yet

Currently NOT part of the library:

- `<lucid-input>`, `<lucid-textarea>`, `<lucid-checkbox>`, `<lucid-radio>`, `<lucid-switch>` — form controls (planned, not shipped)
- `<lucid-modal>`, `<lucid-popover>`, `<lucid-tooltip>`, `<lucid-menu>` — overlays (planned, not shipped)
- `<lucid-toast>`, `<lucid-alert>`, `<lucid-badge>`, `<lucid-progress>` — communication (planned, not shipped)
- `<lucid-avatar>`, `<lucid-divider>`, `<lucid-accordion>`, `<lucid-table>` — content (planned, not shipped)
- Any icon library — use `lucide` directly (framework-agnostic SVG icons).

If the user asks for one of these, say clearly that it's not yet shipped and suggest either (a) building the specific piece with plain HTML + Lucid tokens, or (b) integrating a framework-appropriate alternative. Do NOT invent a `<lucid-*>` element that doesn't exist.

## Documentation and further reading

- Full docs and live examples: **<https://mind-matrix.github.io/lucid>**
- Component reference on the "Components" page includes variants, states, and code snippets
- Source repository: <https://github.com/mind-matrix/lucid>
