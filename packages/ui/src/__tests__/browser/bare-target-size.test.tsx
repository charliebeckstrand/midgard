import { X } from 'lucide-react'
import { describe, expect, it } from 'vitest'
import { Button } from '../../components/button'
import { Icon } from '../../components/icon'
import { renderUI } from '../helpers'

/**
 * Bare-button pointer-target floor (real browser). The bare variant carries no
 * chrome: an icon-only bare border-box is icon + ring-compensated padding
 * (xs 16px, sm 22px), below the WCAG 2.5.8 24px minimum. The box never
 * carries the floor — flooring it inflates the focus ring and hover wash
 * (both paint the box) on sub-24px sizes. TouchTarget floors the hit area
 * instead: its expansion span sizes to `max(100%, 24px)` (44px on coarse
 * pointers) and bubbles pointer events to the host, so the target floors
 * while the box stays on icon + padding.
 *
 * The corpus gate can't pin this: axe measures the host's own border-box and
 * never sees the expansion span, clearing the tag-input's bare X through the
 * spacing exception instead. This probes the hit area directly with
 * `elementFromPoint`. jsdom has no layout (box is zero); this runs only in a
 * real engine with compiled utilities loaded.
 */
describe('bare button pointer-target floor', () => {
	// Natural icon-only border boxes: icon + 2·(spacing − 1px) padding. xs and
	// sm sit below the 24px floor and lean on the TouchTarget expansion; md
	// clears it, collapsing the expansion onto the box.
	it.each([
		['xs', 16],
		['sm', 22],
		['md', 28],
	] as const)('floors the %s hit area to 24px while the box stays on icon + padding', (size, natural) => {
		// The 24px floor under test is the fine-pointer one (2.5.8), not the
		// 44px coarse expansion (2.5.5).
		expect(window.matchMedia('(pointer: fine)').matches).toBe(true)

		const { getByRole } = renderUI(
			<div data-slot="wrap" className="inline-flex p-12">
				<Button aria-label="Remove" variant="bare" size={size}>
					<Icon icon={<X />} />
				</Button>
			</div>,
		)

		const button = getByRole('button')

		const box = button.getBoundingClientRect()

		// The border box never carries the floor...
		expect(box.width).toBe(natural)
		expect(box.height).toBe(natural)

		const cx = box.left + box.width / 2
		const cy = box.top + box.height / 2

		// ...yet every probe 11px out from centre (inside a centred 24px region)
		// resolves into the button: the expansion span captures the point and
		// bubbles to it.
		for (const [x, y] of [
			[cx - 11, cy],
			[cx + 11, cy],
			[cx, cy - 11],
			[cx, cy + 11],
		] as const) {
			const hit = document.elementFromPoint(x, y)

			expect(button.contains(hit)).toBe(true)
		}

		// A probe past both the box and the floor misses, hitting the wrapper
		// padding instead: the floor is exact, not open-ended bleed.
		const beyond = Math.max(box.width / 2, 12) + 4

		const outside = document.elementFromPoint(cx + beyond, cy)

		expect(outside).not.toBeNull()

		expect(button.contains(outside)).toBe(false)
	})

	it('keeps the icon-only footprint on the icon line box', () => {
		const { getByRole } = renderUI(
			<span data-slot="wrap" className="inline-flex">
				<Button aria-label="Remove" variant="bare" size="xs">
					<Icon icon={<X />} />
				</Button>
			</span>,
		)

		const button = getByRole('button')

		const wrap = button.closest('[data-slot="wrap"]') as HTMLElement

		// The negative margins pull back the padding plus its 1px ring
		// compensation (-m-0.75 = 3px against 2px ring-compensated padding);
		// with no box floor the margin-box tucks 1px inside the 12px xs icon
		// per side, so a bare X sits flush in its row and never grows it.
		expect(button.getBoundingClientRect().width).toBe(16)

		expect(wrap.getBoundingClientRect().width).toBe(10)

		expect(wrap.getBoundingClientRect().height).toBe(10)
	})

	it('keeps a labelled bare button footprint on its text line box', () => {
		const { getByRole } = renderUI(
			<span data-slot="wrap" className="inline-flex">
				<Button variant="bare" size="md">
					Remove
				</Button>
			</span>,
		)

		const button = getByRole('button')

		const wrap = button.closest('[data-slot="wrap"]') as HTMLElement

		// A labelled bare button never carried the floor; it keeps the
		// affix-aligned py with a matched -my pull, so its border-box exceeds
		// the md text line box (24px) by 3px per side while the wrapper stays on
		// the line box and the row never grows.
		expect(wrap.getBoundingClientRect().height).toBe(24)

		expect(button.getBoundingClientRect().height).toBe(30)
	})
})
