# Angular example

Add `CUSTOM_ELEMENTS_SCHEMA` to any module/component that uses `<lucid-*>` tags — this tells Angular not to type-check them as Angular components.

For property binding of complex values, use property syntax: `[disabled]="true"`.

Import components at app entry (e.g. `main.ts`):

```ts
import "@mind-matrix/lucid-components";
```
