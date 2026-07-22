# Vue example

Vue consumes custom elements natively. Tell the compiler which tags to skip by adding this to your Vite/Vue config so it doesn't try to resolve `<lucid-*>` as Vue components:

```ts
// vite.config.ts
import vue from "@vitejs/plugin-vue";
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

Then import components once at app entry:

```ts
import "@mind-matrix/lucid-components";
```

Native `click` events bubble from the internal `<button>` to the host, so bind with `@click="..."`. Disabled buttons suppress the event automatically.
