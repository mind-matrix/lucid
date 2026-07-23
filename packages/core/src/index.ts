import * as signalMod from "./signal.ts";
import * as cssMod from "./css.ts";
import * as elementMod from "./element.ts";
import * as jsxMod from "./jsx-runtime.ts";

export const {
  signal,
  effect,
  computed,
  isSignal,
} = signalMod;

export const {
  css,
  styleSheet,
  adoptStyles,
} = cssMod;

export const {
  LucidElement,
  defineElement,
} = elementMod;

export const {
  jsx,
  jsxs,
  Fragment,
} = jsxMod;

export type { Signal } from "./signal.ts";
export type { CSSResult } from "./css.ts";
export type { ElementOptions, PropDef, PropType } from "./element.ts";
export type { JSX, Child, Props } from "./jsx-runtime.ts";
