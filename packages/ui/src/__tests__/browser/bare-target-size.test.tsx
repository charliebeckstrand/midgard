import { X } from 'lucide-react'
import { describe, expect, it } from 'vitest'
import { Button } from '../../components/button'
import { Icon } from '../../components/icon'
import { renderUI } from '../helpers'

/**
 * Bare-button target-size floor (real browser). The bare variant carries no
 * padding: an icon-only bare button's border-box is just the icon — below the
 * WCAG 2.5.8 24px minimum. The recipe floors that box to 24px and pulls the
 * overshoot back with a matched negative margin; the floor never grows the row
 * it sits in.
 *
 * The corpus gate clears the tag-input's bare X through axe's spacing exception
 * and can't detect a no-op floor; this measures the box directly. jsdom has no
 * layout (box is zero); this runs only in a real engine with compiled utilities
 * loaded.
 *
 * On coarse pointers TouchTarget owns the hit area (44px); on fine pointers the
 * hit area is the border-box. The last case pins that invariant.
 */
describe('bare button target-size floor', () => {
	it('floors an icon-only bare box to 24px without growing its footprint', () => {
		const { getByRole } = renderUI(
			<span data-slot="wrap" className="inline-flex">
				<Button aria-label="Remove" variant="bare" size="md">
					<Icon icon={<X />} />
				</Button>
			</span>,
		)

		const button = getByRole('button')

		const wrap = button.closest('[data-slot="wrap"]') as HTMLElement

		const box = button.getBoundingClientRect()

		// Hit box clears the 24px minimum...
		expect(box.width).toBeGreaterThanOrEqual(24)
		expect(box.height).toBeGreaterThanOrEqual(24)

		// ...while the negative margin collapses the margin-box back to the 20px
		// md icon — the wrapper never grows.
		const wrapBox = wrap.getBoundingClientRect()

		expect(wrapBox.width).toBeLessThan(24)
		expect(wrapBox.height).toBeLessThan(24)
	})

	it('leaves a labelled bare button on its natural inline box', () => {
		const { getByRole } = renderUI(
			<span data-slot="wrap" className="inline-flex">
				<Button variant="bare" size="md">
					Remove
				</Button>
			</span>,
		)

		const button = getByRole('button')

		const wrap = button.closest('[data-slot="wrap"]') as HTMLElement

		// `:not([data-has-label])` excludes the floor: no negative-margin pull;
		// the button's margin-box equals its border-box and the wrapper tracks it exactly.
		expect(wrap.getBoundingClientRect().height).toBe(button.getBoundingClientRect().height)
	})

	it('confines the icon-only mouse hit area to the box (no pseudo bleed)', () => {
		// TouchTarget (the 44px coarse expander) is `pointer-fine:hidden`; with a
		// fine pointer the border-box is the complete hit area.
		expect(window.matchMedia('(pointer: fine)').matches).toBe(true)

		const { getByRole } = renderUI(
			<div data-slot="wrap" className="inline-flex p-12">
				<Button aria-label="Remove" variant="bare" size="md">
					<Icon icon={<X />} />
				</Button>
			</div>,
		)

		const button = getByRole('button')

		const box = button.getBoundingClientRect()

		// A point at the box centre lands on the button (its icon bubbles to it)...
		const inside = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)

		expect(button.contains(inside)).toBe(true)

		// ...while a point 4px past the right edge misses the button, hitting the
		// surrounding padding instead.
		const outside = document.elementFromPoint(box.right + 4, box.top + box.height / 2)

		expect(outside).not.toBeNull()

		expect(button.contains(outside)).toBe(false)
	})
})
