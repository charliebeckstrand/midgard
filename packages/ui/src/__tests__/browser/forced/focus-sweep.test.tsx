import { describe, expect, it } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { baseline, rows } from '../../a11y/cases'
import { frames, renderUI } from '../../helpers'
import { tabbables } from '../helpers/tabbables'

/**
 * Each tab stop of the baseline corpus shows its focus under forced colors (WCAG 2.4.7).
 *
 * Forced colors remove a box-shadow and replace a background, and a focus ring or a focus wash
 * draws with only those. The case finds no mechanism by name: it reads the pixels around each
 * stop with no focus on the page, and again when a Tab gives the stop the focus. The two must
 * differ. Thus a ring, an
 * outline, a wash, and a mark on another element all pass, and a stop that paints nothing fails.
 *
 * The stops of one kind, with the same element, role, and classes, show their focus with the
 * same rule, so the case reads the first stop of each kind. The caret of a text field is hidden,
 * because a caret changes the pixels with no focus mark. The case runs with the light author
 * scheme only: a focus fallback paints in `Highlight`, which the palette sets and the author
 * scheme does not change.
 */

/** How far a focus mark can reach out of the box of its stop, in CSS pixels. */
const REACH = 6

/** A hash of the pixels inside `box` and {@link REACH} around it. */
async function shot(box: DOMRect): Promise<string> {
	const probe = document.createElement('div')

	probe.style.cssText = [
		'position: absolute',
		'pointer-events: none',
		`left: ${box.left + scrollX - REACH}px`,
		`top: ${box.top + scrollY - REACH}px`,
		`width: ${box.width + REACH * 2}px`,
		`height: ${box.height + REACH * 2}px`,
	].join('; ')

	document.body.append(probe)

	try {
		const image = new Image()

		image.src = `data:image/png;base64,${await page.screenshot({ element: probe, save: false })}`

		await image.decode()

		const canvas = document.createElement('canvas')

		canvas.width = image.width

		canvas.height = image.height

		const context = canvas.getContext('2d')

		if (!context) throw new Error('expected a 2D context')

		context.drawImage(image, 0, 0)

		let hash = 0

		for (const byte of context.getImageData(0, 0, image.width, image.height).data) {
			hash = (hash * 31 + byte) | 0
		}

		return `${image.width}x${image.height}:${hash}`
	} finally {
		probe.remove()
	}
}

/** The element, the role, the slot, and the name of a stop, to name it in a failure. */
function describeStop(stop: HTMLElement): string {
	const role = stop.getAttribute('role')

	const slot = stop.dataset.slot

	const name = stop.getAttribute('aria-label') ?? stop.textContent?.trim().slice(0, 24) ?? ''

	return `${stop.tagName.toLowerCase()}${role ? `[${role}]` : ''}${slot ? `.${slot}` : ''} "${name}"`
}

describe('focus of each tab stop under forced colors (real browser)', () => {
	it.each(rows(baseline))('%s: each tab stop shows its focus', async (_name, { element }) => {
		const { container } = renderUI(
			<div style={{ padding: REACH * 2, caretColor: 'transparent' }}>{element}</div>,
		)

		await frames()

		const host = container.firstElementChild as HTMLElement

		const stops = tabbables(host)

		// The pixels of the first stop of each kind with no focus on the page.
		const kinds = new Set<string>()

		const pending = new Map<HTMLElement, string>()

		for (const stop of stops) {
			const kind = `${stop.tagName} ${stop.getAttribute('role')} ${stop.className}`

			if (kinds.has(kind)) continue

			kinds.add(kind)

			stop.scrollIntoView({ block: 'nearest', inline: 'nearest' })

			await frames()

			pending.set(stop, await shot(stop.getBoundingClientRect()))
		}

		// A real Tab moves the focus from stop to stop, as a reader does. A stop can take its focus
		// only from the keyboard: the first paint of a Wysiwyg field puts its editor in its place on a
		// Tab, with the same id.
		const unmarked: string[] = []

		if (document.activeElement instanceof HTMLElement) document.activeElement.blur()

		// The first Tab from the page can stop on the document before it reaches the host.
		for (let step = 0; step <= stops.length + 1 && pending.size > 0; step++) {
			await userEvent.tab()

			await frames()

			const active = document.activeElement

			if (!(active instanceof HTMLElement)) continue

			const stop = [...pending.keys()].find(
				(candidate) =>
					candidate === active ||
					(!candidate.isConnected && candidate.id && candidate.id === active.id),
			)

			if (!stop) continue

			if ((await shot(active.getBoundingClientRect())) === pending.get(stop)) {
				unmarked.push(describeStop(stop))
			}

			pending.delete(stop)
		}

		expect(unmarked).toEqual([])

		expect([...pending.keys()].map(describeStop), 'stops that no Tab reached').toEqual([])
	})
})
