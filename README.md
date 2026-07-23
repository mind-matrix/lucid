<a name="readme-top"></a>

[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![MIT License][license-shield]][license-url]
[![LinkedIn][linkedin-shield]][linkedin-url]



<!-- PROJECT LOGO -->
<br />
<div align="center">
  <a href="https://github.com/mind-matrix/lucid">
    <img src="images/logotype.png" alt="Lucid" width="220">
  </a>

  <p align="center">
    An accessibility and localization-first Design System
    <br />
    <a href="https://mind-matrix.github.io/lucid/docs"><strong>Explore the docs »</strong></a>
    <br />
    <br />
    <a href="https://github.com/mind-matrix/lucid">View Demo</a>
    ·
    <a href="https://github.com/mind-matrix/lucid/issues">Report Bug</a>
    ·
    <a href="https://github.com/mind-matrix/lucid/issues">Request Feature</a>
  </p>
</div>



<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
    <li><a href="#acknowledgments">Acknowledgments</a></li>
  </ol>
</details>



<!-- ABOUT THE PROJECT -->
## About The Project

[![Product Name Screen Shot][product-screenshot]](https://example.com)

Lucid is a framework-agnostic UI design system built on Web Components, with accessibility (WCAG 2.1 AA) and internationalization as first-class, non-negotiable contracts. Components ship as native custom elements — drop them into React, Vue, Angular, Astro, Svelte, or vanilla HTML with no wrappers, no runtime, and no lock-in.

Because components are standard HTML elements, clients can use any native attribute or event the browser already supports — `id`, `class`, `style`, `data-*`, all `aria-*` attributes, `tabindex`, `hidden`, `lang`, `dir`, and all DOM events (`click`, `focus`, `keydown`, `pointerdown`, etc.) — no wrapper or bridge code required. Component-specific properties (like `variant` on `<lucid-button>`) are documented per component. Theming happens entirely through CSS custom properties, which cross Shadow DOM via inheritance, so overriding a token on any ancestor cascades down to every lucid component inside it.

<p align="right">(<a href="#readme-top">back to top</a>)</p>



### Built With

* [![Bun][Bun]][Bun-url]
* [![TypeScript][TypeScript]][TypeScript-url]
* [![Web Components][WebComponents]][WebComponents-url]
* [![Playwright][Playwright]][Playwright-url]
* [![axe-core][Axe]][Axe-url]

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- GETTING STARTED -->
## Getting Started

Lucid is a Bun-native monorepo. The library packages (`@mind-matrix/lucid-core`, `@mind-matrix/lucid-components`, `@mind-matrix/lucid-react`) live under `packages/`, the landing site lives under `apps/landing/`, and framework consumption examples live under `examples/`. Follow the steps below to run the workspace locally.

### Prerequisites

Lucid uses Bun for install, build, dev, and tests. No Node, npm, or Vite is required.

* Bun
  ```sh
  curl -fsSL https://bun.sh/install | bash
  ```

### Installation

1. Clone the repo
   ```sh
   git clone https://github.com/mind-matrix/lucid.git
   cd lucid
   ```
2. Install workspace dependencies
   ```sh
   bun install
   ```
3. Run the landing site in dev mode (HMR enabled)
   ```sh
   bun run dev
   ```
4. Build all library packages
   ```sh
   bun run build
   ```
5. Run the full verification suite (typecheck + CSS i18n gate + axe + visual regression)
   ```sh
   bun run verify
   ```

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- USAGE EXAMPLES -->
## Usage

Import the components package once at your app entry, then use the custom elements anywhere in your markup.

```sh
bun add @mind-matrix/lucid-components
```

```html
<!-- Optional: load design tokens so components inherit sensible defaults -->
<link rel="stylesheet" href="@mind-matrix/lucid-core/tokens.css" />
```

```ts
import "@mind-matrix/lucid-components";
```

```html
<lucid-button variant="primary">Save</lucid-button>
<lucid-button variant="ghost" disabled>Cancel</lucid-button>
<lucid-button aria-label="Close dialog">×</lucid-button>
```

Because `<lucid-button>` extends `HTMLElement`, every native attribute and DOM event works without extra wiring — `id`, `class`, `style`, `data-*`, `aria-*`, `tabindex`, `hidden`, `title`, `lang`, `dir`, `onClick`, `onFocus`, `onKeyDown`, etc.

**Framework bindings:**

```tsx
// React (17+)
<lucid-button variant="primary" onClick={onSave}>Save</lucid-button>
```

```vue
<!-- Vue -->
<lucid-button variant="primary" @click="onSave">Save</lucid-button>
```

```ts
// Angular (add CUSTOM_ELEMENTS_SCHEMA to your module)
<lucid-button variant="primary" (click)="onSave($event)">Save</lucid-button>
```

**Theming** happens through CSS custom properties. Override on any ancestor — `:root`, a class, an attribute, or an individual element — and every lucid component inside that subtree updates.

```css
:root {
  --lucid-color-primary: #7c3aed;
  --lucid-radius-md: 12px;
}
```

_For more examples, see the [`examples/`](examples/) directory for React, Vue, Angular, Astro, and vanilla HTML integrations._

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- ROADMAP -->
## Roadmap

- [x] `<lucid-button>` with WCAG 2.1 AA compliance and RTL visual baselines
- [x] JSX runtime, signals, and CSS-in-shadow-DOM primitives
- [x] Physical-CSS ban enforced in CI (i18n gate)
- [x] Playwright + axe-core + LTR/RTL screenshot suite
- [ ] Adding new elements

See the [open issues](https://github.com/mind-matrix/lucid/issues) for a full list of proposed features (and known issues).

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- CONTRIBUTING -->
## Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

Lucid enforces accessibility and internationalization at CI time. Every PR runs `bun run verify`, which will block merges that introduce physical CSS properties (`margin-left`, `float: right`, etc.), axe violations at WCAG 2.1 AA, or unreviewed changes to visual regression baselines. New components are expected to ship with an `a11y.spec.ts`, a `visual.spec.ts`, and a `fixture.html` colocated under the component's `test/` folder.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- LICENSE -->
## License

Distributed under the MIT License. See `LICENSE.txt` for more information.

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- CONTACT -->
## Contact

Open an issue on GitHub for questions, bug reports, or feature requests.

Project Link: [https://github.com/mind-matrix/lucid](https://github.com/mind-matrix/lucid)

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- ACKNOWLEDGMENTS -->
## Acknowledgments

* [Web Components (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Web_components) — the standard lucid is built on
* [WCAG 2.1](https://www.w3.org/TR/WCAG21/) — the accessibility contract every component upholds
* [axe-core](https://github.com/dequelabs/axe-core) — automated accessibility verification
* [Playwright](https://playwright.dev) — cross-browser test runner and visual regression
* [Bun](https://bun.sh) — the runtime, bundler, and package manager powering the entire toolchain
* [Best-README-Template](https://github.com/othneildrew/Best-README-Template) — the scaffold this README is based on

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->
[contributors-shield]: https://img.shields.io/github/contributors/mind-matrix/lucid.svg?style=for-the-badge
[contributors-url]: https://github.com/mind-matrix/lucid/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/mind-matrix/lucid.svg?style=for-the-badge
[forks-url]: https://github.com/mind-matrix/lucid/network/members
[stars-shield]: https://img.shields.io/github/stars/mind-matrix/lucid.svg?style=for-the-badge
[stars-url]: https://github.com/mind-matrix/lucid/stargazers
[issues-shield]: https://img.shields.io/github/issues/mind-matrix/lucid.svg?style=for-the-badge
[issues-url]: https://github.com/mind-matrix/lucid/issues
[license-shield]: https://img.shields.io/github/license/mind-matrix/lucid.svg?style=for-the-badge
[license-url]: https://github.com/mind-matrix/lucid/blob/master/LICENSE.txt
[linkedin-shield]: https://img.shields.io/badge/-LinkedIn-black.svg?style=for-the-badge&logo=linkedin&colorB=555
[linkedin-url]: https://linkedin.com/in/linkedin_username
[product-screenshot]: images/screenshot.png
[Bun]: https://img.shields.io/badge/Bun-000000?style=for-the-badge&logo=bun&logoColor=white
[Bun-url]: https://bun.sh
[TypeScript]: https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white
[TypeScript-url]: https://www.typescriptlang.org/
[WebComponents]: https://img.shields.io/badge/Web%20Components-29ABE2?style=for-the-badge&logo=webcomponentsdotorg&logoColor=white
[WebComponents-url]: https://developer.mozilla.org/en-US/docs/Web/API/Web_components
[Playwright]: https://img.shields.io/badge/Playwright-2EAD33?style=for-the-badge&logo=playwright&logoColor=white
[Playwright-url]: https://playwright.dev
[Axe]: https://img.shields.io/badge/axe--core-663399?style=for-the-badge&logo=deque&logoColor=white
[Axe-url]: https://www.deque.com/axe/
