import { X } from 'lucide-react'
import { describe, expect, it } from 'vitest'
import { Button } from '../../components/button'
import { Icon } from '../../components/icon'
import { renderUI } from '../helpers'

/**
 * Bare-button target-size floor (real browser). The bare variant carries no
 * padding, so an icon-only bare button's border-box is just the icon — below
 * the WCAG 2.5.8 24px minimum the geometry gate (a11y-geometry.test.tsx)
 * enforces. The recipe floors that box to 24px and pulls the overshoot back
 * with a matched negative margin so the floor never grows the row it sits in.
 *
 * The corpus gate clears the tag-input's bare X through axe's spacing
 * exception, so it can't see this floor regress — a no-op floor would still
 * pass there. This measures the box directly. jsdom has no layout (the box is
 * zero), so it can only run in a real engine with the compiled utilities loaded.
 *
 * The floor carries compliance instead of the variant's former `::before`
 * pointer slop, which is now removed: on coarse pointers TouchTarget owns the
 * hit area (44px), and on fine pointers the slop only bled invisibly past the
 * box. The last case pins that the fine-pointer hit area is now exactly the box.
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

		// The hit box clears the 24px minimum...
		expect(box.width).toBeGreaterThanOrEqual(24)
		expect(box.height).toBeGreaterThanOrEqual(24)

		// ...while the negative margin collapses its margin-box back to the 20px
		// md icon, so the wrapper — and any row it sits in — never grows.
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

		// `:not([data-has-label])` excludes the floor, so there is no negative-margin
		// pull: the button's margin-box equals its border-box and the wrapper tracks
		// the button exactly. (An unconditional floor would shrink the wrapper below.)
		expect(wrap.getBoundingClientRect().height).toBe(button.getBoundingClientRect().height)
	})

	it('confines the icon-only mouse hit area to the box (no pseudo bleed)', () => {
		// The removed `::before` slop only ever widened the fine-pointer area
		// (TouchTarget, the 44px coarse expander, is `pointer-fine:hidden`). Assert
		// this engine reports a fine pointer so the box is the whole hit story here.
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

		// ...while a point 4px past the edge — well inside the old 8px `-inset-2`
		// slop — now misses the button, hitting the surrounding padding instead.
		const outside = document.elementFromPoint(box.right + 4, box.top + box.height / 2)
		expect(outside).not.toBeNull()
		expect(button.contains(outside)).toBe(false)
	})
})
