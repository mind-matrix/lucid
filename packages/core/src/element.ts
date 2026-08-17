import { adoptStyles, type CSSResult } from "./css.ts";
import { effect } from "./signal.ts";

export enum PropType {
  STRING = "string",
  NUMBER = "number",
  BOOLEAN = "boolean"
};
export type PropDef = { type: PropType; default?: unknown; attribute?: string | false };

export type ElementOptions = {
  styles?: readonly CSSResult[];
  shadow?: ShadowRootMode | false;
  props?: Record<string, PropDef>;
};

export abstract class LucidElement extends HTMLElement {
  static styles: readonly CSSResult[] = [];
  static props: Record<string, PropDef> = {};
  static shadow: ShadowRootMode | false = "open";

  #root: ShadowRoot | this;
  /**
   * The top-level nodes produced by the last `render()`.
   *
   * Tracked as an array because `render()` may return a DocumentFragment
   * (a JSX `<>…</>` with several children). Appending a fragment moves its
   * children out and leaves the fragment empty, so the fragment itself is
   * useless as an update handle — we have to remember the children.
   */
  #renderedNodes: Node[] = [];
  #updateScheduled = false;
  #disposers: Array<() => void> = [];

  constructor() {
    super();
    const ctor = this.constructor as typeof LucidElement;
    if (ctor.shadow === false) {
      this.#root = this;
    } else {
      this.#root = this.attachShadow({ mode: ctor.shadow });
      adoptStyles(this.#root as ShadowRoot, ctor.styles);
    }
  }

  static get observedAttributes(): string[] {
    return Object.entries(this.props)
      .filter(([, def]) => def.attribute !== false)
      .map(([name, def]) => (typeof def.attribute === "string" ? def.attribute : name));
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null): void {
    const ctor = this.constructor as typeof LucidElement;
    const entry = Object.entries(ctor.props).find(
      ([n, def]) => (typeof def.attribute === "string" ? def.attribute : n) === name,
    );
    if (!entry) { return; }
    const [propName, def] = entry;
    (this as unknown as Record<string, unknown>)[propName] = coerce(value, def.type);
  }

  connectedCallback(): void {
    if (this.#renderedNodes.length === 0) { this.#doRender(); }
  }

  requestUpdate(): void {
    if (this.#updateScheduled || this.#renderedNodes.length === 0) { return; }
    this.#updateScheduled = true;
    queueMicrotask(() => {
      this.#updateScheduled = false;
      this.#doRender();
    });
  }

  #doRender(): void {
    const next = this.render();
    // Capture the children BEFORE appending: appending a DocumentFragment
    // moves its children into the root and empties the fragment.
    const nextNodes =
      next instanceof DocumentFragment
        ? Array.from(next.childNodes)
        : [next];

    for (const node of this.#renderedNodes) {
      node.parentNode?.removeChild(node);
    }
    this.#root.appendChild(next);
    this.#renderedNodes = nextNodes;
    this.updated();
  }

  /**
   * Called synchronously after every render, before the next paint.
   *
   * `render()` produces a brand-new tree each time, so imperative state
   * that lives on the *nodes* rather than in markup — top-layer promotion
   * via `showPopover()`, scroll offsets, measured positions — is discarded
   * on update and has to be re-applied here. Default is a no-op.
   */
  protected updated(): void {}

  disconnectedCallback(): void {
    for (const d of this.#disposers) { d(); }
    this.#disposers = [];
  }

  protected effect(fn: () => void | (() => void)): void {
    this.#disposers.push(effect(fn));
  }

  protected emit<T = unknown>(type: string, detail?: T, init?: EventInit): boolean {
    return this.dispatchEvent(
      new CustomEvent<T>(type, { bubbles: true, composed: true, ...init, detail }),
    );
  }

  protected abstract render(): Node;
}

function coerce(value: string | null, type: PropType): unknown {
  if (value === null) { return type === "boolean" ? false : undefined; }
  if (type === "number") { return Number(value); }
  if (type === "boolean") { return value !== "false"; }
  return value;
}

export function defineElement(tag: string, ctor: CustomElementConstructor): void {
  if (!customElements.get(tag)) { customElements.define(tag, ctor); }
}
