import { useRef, useState } from 'react'
import { describe, expect, it } from 'vitest'
import { CurrentContent, CurrentContents, CurrentContext } from '../../primitives/current'
import { useCurrentContentsMorph } from '../../primitives/current/use-current-contents-morph'
import { renderUI, waitFor } from '../helpers'

/**
 * Real-browser probe of the current-panel height morph. The jsdom morph test
 * mocks `getBoundingClientRect` to fixed heights, so it can only see the pin;
 * whether the box then *tweens* — instead of snapping to the target the moment
 * anything re-renders — is exactly what jsdom can't observe. The morph runs
 * imperatively (`animate` from `motion`, unmocked in this suite) against real
 * layout, so these tests sample the container's border box across frames and
 * assert it passes through intermediate heights before settling back at
 * `height: auto`.
 */

/** Samples `element`'s border-box height once per frame for `ms`. */
async function sampleHeights(element: Element, ms: number): Promise<number[]> {
	const samples: number[] = []

	const start = performance.now()

	await new Promise<void>((resolve) => {
		const tick = () => {
			samples.push(element.getBoundingClientRect().height)

			if (performance.now() - start < ms) requestAnimationFrame(tick)
			else resolve()
		}

		requestAnimationFrame(tick)
	})

	return samples
}

/** At least one sample sits strictly inside `(low, high)` — a tween, not a snap. */
function hasIntermediate(samples: number[], low: number, high: number): boolean {
	return samples.some((height) => height > low + 1 && height < high - 1)
}

/**
 * Minimal harness around the hook: a `height: auto`, overflow-hidden container
 * with one in-flow `data-current` panel whose height toggles at constant width.
 */
function GrowProbe() {
	const ref = useRef<HTMLDivElement>(null)

	const [tall, setTall] = useState(false)

	useCurrentContentsMorph(ref, true)

	return (
		<div style={{ width: 300 }}>
			<button type="button" data-testid="grow" onClick={() => setTall(true)}>
				grow
			</button>
			<div ref={ref} data-testid="box" style={{ overflow: 'hidden', position: 'relative' }}>
				<div data-current="" style={{ height: tall ? 240 : 120 }} />
			</div>
		</div>
	)
}

/** The full container: a panel switch between a tall and a short panel. */
function SwitchProbe() {
	const [value, setValue] = useState<string | undefined>('tall')

	return (
		<div style={{ width: 300 }}>
			<button type="button" data-testid="switch" onClick={() => setValue('short')}>
				switch
			</button>
			<CurrentContext value={{ value, onValueChange: setValue }}>
				<CurrentContents slotPrefix="test" data-testid="box">
					<CurrentContent slotPrefix="test" value="tall">
						<div style={{ height: 240 }} />
					</CurrentContent>
					<CurrentContent slotPrefix="test" value="short">
						<div style={{ height: 80 }} />
					</CurrentContent>
				</CurrentContents>
			</CurrentContext>
		</div>
	)
}

describe('current-panel height morph (real browser)', () => {
	it('tweens a panel growing in place at constant width', async () => {
		const { container } = renderUI(<GrowProbe />)

		const box = container.querySelector<HTMLElement>('[data-testid="box"]')

		const grow = container.querySelector<HTMLButtonElement>('[data-testid="grow"]')

		if (!box || !grow) throw new Error('probe did not render')

		// Settle the observer baseline for the initial 120px panel.
		await waitFor(() => expect(box.getBoundingClientRect().height).toBeCloseTo(120, 0))

		// Grow the sole in-flow panel to 240px at unchanged width: a discrete
		// height change the container should morph toward, not snap to.
		grow.click()

		const samples = await sampleHeights(box, 500)

		expect(hasIntermediate(samples, 120, 240)).toBe(true)

		// The tween lands on the target and hands the box back to layout.
		await waitFor(() => expect(box.getBoundingClientRect().height).toBeCloseTo(240, 0))

		await waitFor(() => expect(box.style.height).toBe(''))
	})

	it('tweens the container across a panel switch instead of snapping', async () => {
		const { container } = renderUI(<SwitchProbe />)

		const box = container.querySelector<HTMLElement>('[data-testid="box"]')

		const swap = container.querySelector<HTMLButtonElement>('[data-testid="switch"]')

		if (!box || !swap) throw new Error('probe did not render')

		await waitFor(() => expect(box.getBoundingClientRect().height).toBeCloseTo(240, 0))

		swap.click()

		const samples = await sampleHeights(box, 500)

		// The switch must never present the incoming height in the first frame:
		// the box leaves 240 through intermediate heights on its way to 80.
		expect(hasIntermediate(samples, 80, 240)).toBe(true)

		await waitFor(() => expect(box.getBoundingClientRect().height).toBeCloseTo(80, 0))

		await waitFor(() => expect(box.style.height).toBe(''))
	})
})
