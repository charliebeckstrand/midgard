/**
 * Coerce a boolean flag to a spread-safe ARIA boolean attribute value: `true`
 * when set, `undefined` otherwise. JSX renders `aria-disabled="true"` when set
 * and omits the attribute for `undefined`, so call sites stay unconditional.
 *
 * @remarks
 * The single-attribute sibling of {@link invalidAttrs} (`aria-invalid`); use
 * {@link dataAttr} for `data-*` presence flags, which render an empty string.
 *
 * @example
 *   <button aria-disabled={ariaAttr(disabled)} aria-busy={ariaAttr(loading)} />
 */
export function ariaAttr(value: boolean | undefined): true | undefined {
	return value ? true : undefined
}
