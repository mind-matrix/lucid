export type CSSResult = { readonly sheet: CSSStyleSheet; readonly text: string };

const tagCache = new WeakMap<TemplateStringsArray, CSSResult>();
const textCache = new Map<string, CSSResult>();

export function css(
  strings: TemplateStringsArray,
  ...values: unknown[]
): CSSResult {
  const cached = tagCache.get(strings);
  if (cached && values.length === 0) { return cached; }

  let text = "";
  for (let i = 0; i < strings.length; i++) {
    text += strings[i];
    if (i < values.length) { text += String(values[i]); }
  }

  const result = styleSheet(text);
  if (values.length === 0) { tagCache.set(strings, result); }
  return result;
}

export function styleSheet(text: string): CSSResult {
  const cached = textCache.get(text);
  if (cached) { return cached; }

  const sheet = new CSSStyleSheet();
  sheet.replaceSync(text);
  const result: CSSResult = { sheet, text };
  textCache.set(text, result);
  return result;
}

export function adoptStyles(root: ShadowRoot, styles: readonly CSSResult[]): void {
  root.adoptedStyleSheets = [...root.adoptedStyleSheets, ...styles.map((s) => s.sheet)];
}
