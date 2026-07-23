import { effect, isSignal, type Signal } from "./signal.ts";

export type Child =
  | Node
  | string
  | number
  | boolean
  | null
  | undefined
  | Signal<unknown>
  | Child[];

export type Props = Record<string, unknown> & {
  children?: Child;
  ref?: (el: Element) => void;
};

export const Fragment = Symbol.for("lucid.fragment");

type ComponentFn = (props: Props) => Node;
type TagOrComponent = string | ComponentFn | typeof Fragment;

function appendChild(parent: Node, child: Child): void {
  if (child == null || child === false || child === true) { return; }

  if (Array.isArray(child)) {
    for (const c of child) { appendChild(parent, c); }
    return;
  }

  if (isSignal(child)) {
    const text = document.createTextNode("");
    parent.appendChild(text);
    effect(() => {
      const v = (child as Signal<unknown>)();
      text.data = v == null ? "" : String(v);
    });
    return;
  }

  if (child instanceof Node) {
    parent.appendChild(child);
    return;
  }

  parent.appendChild(document.createTextNode(String(child)));
}

function setProp(el: Element, key: string, value: unknown): void {
  if (key === "children" || key === "ref") { return; }

  if (key === "style" && value && typeof value === "object") {
    Object.assign((el as HTMLElement).style, value);
    return;
  }

  if (key === "class" || key === "className") {
    if (isSignal(value)) {
      effect(() => {
        el.setAttribute("class", String((value as Signal<unknown>)() ?? ""));
      });
    } else {
      el.setAttribute("class", String(value ?? ""));
    }
    return;
  }

  if (key.startsWith("on") && typeof value === "function") {
    const event = key.slice(2).toLowerCase();
    el.addEventListener(event, value as EventListener);
    return;
  }

  if (isSignal(value)) {
    effect(() => applyAttr(el, key, (value as Signal<unknown>)()));
    return;
  }

  applyAttr(el, key, value);
}

function applyAttr(el: Element, key: string, value: unknown): void {
  if (value === false || value == null) {
    el.removeAttribute(key);
    return;
  }
  if (value === true) {
    el.setAttribute(key, "");
    return;
  }
  el.setAttribute(key, String(value));
}

export function jsx(tag: TagOrComponent, props: Props): Node {
  if (tag === Fragment) {
    const frag = document.createDocumentFragment();
    appendChild(frag, props.children);
    return frag;
  }

  if (typeof tag === "function") { return tag(props); }

  const el = document.createElement(tag);

  for (const key in props) {
    if (key === "children" || key === "ref") { continue; }
    setProp(el, key, props[key]);
  }

  appendChild(el, props.children);

  if (typeof props.ref === "function") { props.ref(el); }
  return el;
}

export const jsxs = jsx;

export namespace JSX {
  export type Element = Node;
  export interface ElementChildrenAttribute {
    children: {};
  }
  export interface IntrinsicElements {
    [tagName: string]: Record<string, unknown> & { children?: Child };
  }
}
