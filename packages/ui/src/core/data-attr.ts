/**
 * Coerce a boolean flag to a spread-safe `data-*` attribute value: an empty
 * string when set, `undefined` otherwise. JSX renders the attribute as a bare
 * presence marker (`data-current=""`) when set and omits it for `undefined`,
 * so call sites stay unconditional and presence-based CSS (`data-[current]:…`)
 * matches.
 *
 * @remarks
 * The single-attribute sibling of {@link invalidAttrs} (`data-invalid`); use
 * {@link ariaAttr} for ARIA boolean attributes, which need a literal `"true"`.
 *
 * @example
 *   <li data-current={dataAttr(current)} />
 */
export function dataAttr(value: boolean | undefined): '' | undefined {
	return value ? '' : undefined
}
