/** The value of `text-box` that trims a text box to the cap height and the baseline. */
export const TEXT_TRIM = 'trim-both cap alphabetic'

/**
 * The class that marks the root element when the browser reads the trim of a
 * text box ({@link TEXT_TRIM}) but does not trim an inline box. Safari
 * 18.2 trims only a block container. `AppearanceProvider` adds it after
 * hydration ({@link markInlineTrim}). The `inline-trim` variant reads it
 * (`core/text-trim/variants.ts`).
 */
export const ROOT_NO_INLINE_TRIM_CLASS = 'no-inline-trim'

/**
 * Adds {@link ROOT_NO_INLINE_TRIM_CLASS} to `root` when the browser reads the
 * trim of a text box but does not trim an inline box.
 *
 * @remarks
 * No CSS query can see if the browser trims an inline box, so a probe measures
 * one. The probe is an inline box with the trim in a hidden block. A trimmed
 * box is as tall as the cap height of its font, and a box with no trim is as
 * tall as the ascent and the descent, which are always more. The probe and a
 * block of `1cap` share one font size, so the test holds for each font.
 */
export function markInlineTrim(root: HTMLElement) {
	if (!CSS.supports('text-box', TEXT_TRIM)) return

	const host = document.createElement('div')

	host.style.cssText = 'position:absolute;visibility:hidden;font-size:100px;line-height:1'

	const box = document.createElement('span')

	box.style.cssText = `text-box:${TEXT_TRIM}`

	// An empty inline box has no height, so the probe needs a glyph. The glyph is
	// hidden, and no reader sees it.
	box.textContent = 'X'

	const cap = document.createElement('div')

	cap.style.height = '1cap'

	host.append(box, cap)

	document.body.append(host)

	const trims = box.getBoundingClientRect().height < cap.getBoundingClientRect().height + 1

	host.remove()

	root.classList.toggle(ROOT_NO_INLINE_TRIM_CLASS, !trims)
}
