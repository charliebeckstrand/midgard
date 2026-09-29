import { describe, expect, it } from 'vitest'
import { ReadyReveal } from '../../primitives/ready-reveal'
import { getSlot, renderUI, screen } from '../helpers'

/**
 * `ReadyReveal`'s content layer is a plain block `div`, so **an inline-level child sits in a line
 * box and a block-level one does not** — which decides whether the reveal is the height of what
 * it holds.
 *
 * Not a hypothetical. The AP review bar puts three controls on one row, two of them inside a
 * reveal, and centres them with `items-center`. Every reveal centred correctly and the control
 * inside one still read two pixels high: the line box took its height from the *inherited*
 * `line-height` (the row's `text-base`, 24px) rather than from the 20px control, and the control
 * then sat on that line box's baseline. `apps/tms/…/review/review-bar.tsx` is why those
 * controls are `flex w-fit` rather than `inline-flex`, and this is the fact it depends on.
 *
 * Pinned here rather than there because it is a property of this primitive, and because only the
 * real browser can see it — jsdom reports no line boxes at all, so the app's jsdom suite would
 * pass either way.
 *
 * **The first case pins a limitation, not a desirable property.** Blockifying the content layer
 * (making it `grid` or `flex`) would fix this for every consumer and is the better end state; it
 * is unmade only because it changes the height of every reveal in the app holding an inline
 * child, which wants its own change and its own look at those call sites. Whoever makes it should
 * change the first case below to expect equality — the invariant the primitive's own comment
 * claims — and drop `flex w-fit` from `review-bar.tsx`, not work around this test.
 */

/** A 20px-tall control, at a type step shorter than the 24px line-height it will inherit. */
function control(display: 'inline-flex' | 'flex w-fit') {
	return (
		<span data-testid="control" className={`${display} items-center gap-1 text-sm`}>
			Why did this escalate?
		</span>
	)
}

function heights(display: 'inline-flex' | 'flex w-fit') {
	const { container } = renderUI(
		// `text-base` on the host, as the bar has: the line-height the child inherits is the
		// whole mechanism, and a host that set none would inherit the same 16px/24px from the
		// document and prove nothing about where it came from.
		<div className="text-base">
			<ReadyReveal ready placeholder={<span>…</span>}>
				{control(display)}
			</ReadyReveal>
		</div>,
	)

	const reveal = getSlot(container, 'ready-reveal')

	const child = screen.getByTestId('control')

	return {
		reveal: Math.round(reveal.getBoundingClientRect().height),
		child: Math.round(child.getBoundingClientRect().height),
	}
}

describe('ReadyReveal and its child’s line box', () => {
	it('reserves the inherited line box around an inline child, standing taller than it', () => {
		const { reveal, child } = heights('inline-flex')

		expect(child).toBe(20)
		expect(reveal).toBeGreaterThan(child)
	})

	it('is exactly its child’s height when that child is block-level', () => {
		const { reveal, child } = heights('flex w-fit')

		expect(child).toBe(20)
		expect(reveal).toBe(child)
	})
})
