import { adoptStyles, type CSSResult } from "./css.ts";
import { effect } from "./signal.ts";

export type PropType = "string" | "number" | "boolean";
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
  #rendered = false;
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
    if (!entry) return;
    const [propName, def] = entry;
    (this as unknown as Record<string, unknown>)[propName] = coerce(value, def.type);
  }

  connectedCallback(): void {
    if (!this.#rendered) {
      this.#rendered = true;
      const node = this.render();
      this.#root.appendChild(node);
    }
  }

  disconnectedCallback(): void {
    for (const d of this.#disposers) d();
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
  if (value === null) return type === "boolean" ? false : undefined;
  if (type === "number") return Number(value);
  if (type === "boolean") return value !== "false";
  return value;
}

export function defineElement(tag: string, ctor: CustomElementConstructor): void {
  if (!customElements.get(tag)) customElements.define(tag, ctor);
}
