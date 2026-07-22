export type Signal<T> = {
  (): T;
  set(next: T | ((prev: T) => T)): void;
  subscribe(fn: (value: T) => void): () => void;
};

type Effect = () => void;
let currentEffect: Effect | null = null;

export function signal<T>(initial: T): Signal<T> {
  let value = initial;
  const subs = new Set<Effect>();

  const read = (() => {
    if (currentEffect) subs.add(currentEffect);
    return value;
  }) as Signal<T>;

  read.set = (next) => {
    const resolved =
      typeof next === "function" ? (next as (p: T) => T)(value) : next;
    if (Object.is(resolved, value)) return;
    value = resolved;
    for (const s of [...subs]) s();
  };

  read.subscribe = (fn) => {
    const wrapped: Effect = () => fn(value);
    subs.add(wrapped);
    return () => {
      subs.delete(wrapped);
    };
  };

  return read;
}

export function effect(fn: () => void | (() => void)): () => void {
  let cleanup: void | (() => void);
  const run: Effect = () => {
    if (typeof cleanup === "function") cleanup();
    const prev = currentEffect;
    currentEffect = run;
    try {
      cleanup = fn();
    } finally {
      currentEffect = prev;
    }
  };
  run();
  return () => {
    if (typeof cleanup === "function") cleanup();
  };
}

export function computed<T>(fn: () => T): Signal<T> {
  const s = signal<T>(undefined as unknown as T);
  effect(() => s.set(fn()));
  return s;
}

export function isSignal(v: unknown): v is Signal<unknown> {
  return (
    typeof v === "function" &&
    typeof (v as Signal<unknown>).subscribe === "function" &&
    typeof (v as Signal<unknown>).set === "function"
  );
}
