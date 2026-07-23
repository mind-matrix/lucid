import {
  createElement,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type ComponentType,
  type ForwardedRef,
  type ReactNode,
} from "react";

type EventMap = Record<string, string>;

export type CreateComponentOptions<Events extends EventMap = {}> = {
  tagName: string;
  displayName?: string;
  events?: Events;
};

type EventProps<Events extends EventMap> = {
  [K in keyof Events as `on${Capitalize<string & K>}`]?: (e: CustomEvent) => void;
};

export type LucidReactProps<Events extends EventMap = {}> = EventProps<Events> & {
  children?: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  [attr: string]: unknown;
};

export function createComponent<
  ElementT extends HTMLElement,
  Events extends EventMap = {},
>(options: CreateComponentOptions<Events>): ComponentType<LucidReactProps<Events>> {
  const { tagName, events = {} as Events, displayName } = options;

  const Component = forwardRef<ElementT, LucidReactProps<Events>>(function Lucid(
    props,
    ref: ForwardedRef<ElementT>,
  ) {
    const localRef = useRef<ElementT | null>(null);
    useImperativeHandle(ref, () => localRef.current as ElementT);

    const { children, ...rest } = props;

    useEffect(() => {
      const el = localRef.current;
      if (!el) { return; }
      const cleanups: Array<() => void> = [];

      for (const [reactName, domEvent] of Object.entries(events)) {
        const handler = (rest as Record<string, unknown>)[
          `on${reactName[0]!.toUpperCase()}${reactName.slice(1)}`
        ] as ((e: CustomEvent) => void) | undefined;
        if (typeof handler === "function") {
          el.addEventListener(domEvent, handler as EventListener);
          cleanups.push(() =>
            el.removeEventListener(domEvent, handler as EventListener),
          );
        }
      }
      return () => cleanups.forEach((c) => c());
    });

    useEffect(() => {
      const el = localRef.current;
      if (!el) { return; }
      for (const [key, value] of Object.entries(rest)) {
        if (key.startsWith("on") || key === "className" || key === "style") { continue; }
        if (value != null && typeof value === "object") {
          (el as unknown as Record<string, unknown>)[key] = value;
        }
      }
    });

    const domProps: Record<string, unknown> = { ref: localRef };
    for (const [key, value] of Object.entries(rest)) {
      if (key.startsWith("on")) { continue; }
      if (value == null || typeof value === "object") { continue; }
      if (typeof value === "boolean") {
        if (value) { domProps[key] = ""; }
        continue;
      }
      domProps[key] = value;
    }
    if (rest.className) { domProps.className = rest.className; }
    if (rest.style) { domProps.style = rest.style; }

    return createElement(tagName, domProps, children as ReactNode);
  });

  Component.displayName = displayName ?? `Lucid(${tagName})`;
  return Component as unknown as ComponentType<LucidReactProps<Events>>;
}
