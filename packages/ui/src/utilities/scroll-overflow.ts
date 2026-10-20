/**
 * Whether an `overflow` value lets the user scroll the box: `auto`, `scroll`,
 * or the legacy `overlay`, which a browser reads as `auto`. The value alone
 * does not tell whether the box overflows now. A caller that needs that also
 * compares the scroll size with the client size.
 *
 * @internal
 */
export function isScrollOverflow(overflow: string): boolean {
	return overflow === 'auto' || overflow === 'scroll' || overflow === 'overlay'
}
