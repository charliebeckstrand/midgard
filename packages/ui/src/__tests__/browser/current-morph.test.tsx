import { Profiler, useRef, useState } from 'react'
import { describe, expect, it } from 'vitest'
import { CurrentContent, CurrentContents, CurrentContext } from '../../primitives/current'
import { useCurrentContentsMorph } from '../../primitives/current/use-current-contents-morph'
import {
	frames,
	getSlot,
	hasIntermediate,
	renderUI,
	sampleHeights,
	screen,
	waitFor,
} from '../helpers'

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
	const [value, setValue] = useState<string | null>('tall')

	return (
		<div style={{ width: 300 }}>
			<button type="button" data-testid="switch" onClick={() => setValue('short')}>
				switch
			</button>
			<CurrentContext value={{ value: value ?? undefined, onValueChange: setValue }}>
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
		renderUI(<GrowProbe />)

		const box = screen.getByTestId('box')

		const grow = screen.getByTestId('grow')

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
		renderUI(<SwitchProbe />)

		const box = screen.getByTestId('box')

		const swap = screen.getByTestId('switch')

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

/**
 * The other half of the morph contract: what must NOT happen. A width-coupled
 * resize — a window drag, a panel reflowing text at a new width — has to pass
 * through with no morph, no inline pin, and no React commit at all. That
 * silence is what stops one drag frame cascading into every panel's subtree
 * once per `ResizeObserver` frame.
 *
 * jsdom asserted this by stubbing `ResizeObserver`, hand-building
 * `borderBoxSize` entries for a synthetic burst, and stubbing
 * `getBoundingClientRect` to fixed boxes — so it proved the hook's arithmetic
 * over numbers the test supplied, never that a real drag is silent. Here the
 * host really narrows, the panel's text really reflows, and the engine's own
 * observer delivers the frames.
 */
describe('current-panel morph, width-coupled resizes (real browser)', () => {
	const PROSE =
		'A panel whose text reflows as the container narrows, so its height is coupled to its width and every drag frame reports a new border box.'

	/** A fading container whose sole panel reflows, under a commit counter. */
	function ReflowProbe({ onCommit }: { onCommit: () => void }) {
		return (
			<div data-testid="host" style={{ width: 600 }}>
				<Profiler id="host" onRender={onCommit}>
					<CurrentContext value={{ value: 'a', onValueChange: undefined }}>
						<CurrentContents slotPrefix="test" fade mount="always">
							<CurrentContent slotPrefix="test" value="a">
								<p style={{ margin: 0 }}>{PROSE}</p>
							</CurrentContent>
							<CurrentContent slotPrefix="test" value="b">
								<p style={{ margin: 0 }}>{PROSE}</p>
							</CurrentContent>
						</CurrentContents>
					</CurrentContext>
				</Profiler>
			</div>
		)
	}

	/** Mounts the probe and settles the observer baseline. */
	async function settled() {
		let commits = 0

		const { container } = renderUI(<ReflowProbe onCommit={() => commits++} />)

		const host = screen.getByTestId('host')

		const box = getSlot(container, 'test-contents')

		await waitFor(() => expect(box.getBoundingClientRect().height).toBeGreaterThan(0))

		await frames()

		await frames()

		return { box, host, commits: () => commits }
	}

	it('rests at auto height with no inline pin', async () => {
		const { box } = await settled()

		expect(box.style.height).toBe('')
	})

	it('passes a width-coupled drag through with no re-render and no pin', async () => {
		const { box, host, commits } = await settled()

		const before = commits()

		// The drag: each step narrows the host, which reflows the prose, which
		// moves the panel height. Height follows width, so nothing here is a
		// height-only change and nothing may morph.
		for (const width of [560, 520, 480, 440, 400]) {
			host.style.width = `${width}px`

			await frames()

			expect(box.style.height).toBe('')
		}

		// The container measured a new box on every one of those frames and
		// re-rendered for none of them.
		expect(commits()).toBe(before)

		expect(box.style.height).toBe('')
	})
})
