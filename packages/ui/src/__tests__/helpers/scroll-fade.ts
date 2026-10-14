/** The width of a full edge fade, 1.5rem at the root font size of the suite. */
const FULL_FADE_PX = 24

/** The part of the mask length past 100%, in pixels, as `calc(100% ± Npx)` or `100%`. */
const MASK_LENGTH = /^(?:calc\(100% ([+-]) ([\d.]+)px\)|100%)$/

/**
 * The block edges that the drawn `scroll-fade-block` mask fades. The mask
 * image has a full fade at each end, and the mask extends past each edge by
 * the part of that fade that does not show (`core/scroll/fade.ts`). Thus an
 * edge fades when the mask extends past it by less than a full fade.
 *
 * @param el - The element that carries the utility.
 * @returns Whether the top edge and the bottom edge fade.
 */
export function fadedEdges(el: HTMLElement): { top: boolean; bottom: boolean } {
	const style = getComputedStyle(el)

	if (style.maskImage === 'none') return { top: false, bottom: false }

	// The block value follows the inline value, `100%` for the size and `0px`
	// for the position.
	const y = Number.parseFloat(style.maskPosition.split(' ').at(-1) ?? '')

	const length = style.maskSize.replace(/^100% /, '')

	const match = MASK_LENGTH.exec(length)

	if (Number.isNaN(y) || !match) {
		throw new Error(`Unexpected mask box: ${style.maskPosition} / ${style.maskSize}`)
	}

	const extra = match[1] ? Number(`${match[1]}${match[2]}`) : 0

	return { top: -y < FULL_FADE_PX, bottom: y + extra < FULL_FADE_PX }
}
