import { X } from 'lucide-react'
import { describe, expect, it } from 'vitest'
import { Button } from '../../components/button'
import { Icon } from '../../components/icon'
import { renderUI } from '../helpers'

/**
 * Bare-button target-size floor (real browser). The bare variant carries only
 * its compound icon padding: an icon-only bare button's padded box (xs 18px,
 * sm 24px) can sit below the WCAG 2.5.8 24px minimum, so the recipe floors it
 * with `min-w-6 min-h-6`. The floored border-box is the real footprint — there
 * is no margin pull; inside a control affix the host re-aligns the glyph by
 * subtracting the button's padding from its own (see
 * `recipes/boundary/affix-compensation-boundary.test.ts`).
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
	// xs sits below 24px naturally (12px icon + p-0.75) and leans on the floor;
	// sm lands exactly on it (16px + p-1); md clears it on padding alone
	// (20px + p-1.25 = 30px).
	it.each([
		['xs', 24],
		['sm', 24],
		['md', 30],
	] as const)('floors an icon-only bare %s box at the 24px minimum', (size, expected) => {
		const { getByRole } = renderUI(
			<span data-slot="wrap" className="inline-flex">
				<Button aria-label="Remove" variant="bare" size={size}>
					<Icon icon={<X />} />
				</Button>
			</span>,
		)

		const button = getByRole('button')

		const wrap = button.closest('[data-slot="wrap"]') as HTMLElement

		const box = button.getBoundingClientRect()

		expect(box.width).toBe(expected)
		expect(box.height).toBe(expected)

		// The floored border-box is the footprint: no negative margin pulls the
		// margin-box back, so the wrapper sits exactly on the button's box.
		const wrapBox = wrap.getBoundingClientRect()

		expect(wrapBox.width).toBe(box.width)
		expect(wrapBox.height).toBe(box.height)
	})

	it('keeps a labelled bare button in lockstep with same-size control chrome', () => {
		const { getByRole } = renderUI(
			<span data-slot="wrap" className="inline-flex">
				<Button variant="bare" size="md">
					Remove
				</Button>
			</span>,
		)

		const button = getByRole('button')

		const wrap = button.closest('[data-slot="wrap"]') as HTMLElement

		// A labelled bare button is excluded from the floor and the icon-only
		// compound padding; it carries the size-level `data-[has-label]:py`, so
		// its border-box matches same-size Input/Select chrome (md → 38px) and
		// is its own footprint.
		expect(button.getBoundingClientRect().height).toBe(38)

		expect(wrap.getBoundingClientRect().height).toBe(38)
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
