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
})
