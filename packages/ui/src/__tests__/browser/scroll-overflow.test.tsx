import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { type ScrollOverflowOptions, useScrollOverflow } from '../../hooks/use-scroll-overflow'
import { frames, present, renderUI, screen, waitFor } from '../helpers'

/**
 * {@link useScrollOverflow} stamps `data-overflow-above` / `data-overflow-below`
 * on a scroller so a recipe can fade the edge that has more content behind it.
 * Every one of those decisions is a comparison of `scrollTop`, `clientHeight`
 * and `scrollHeight` — three numbers jsdom reports as zero and its unit suite
 * therefore wrote by hand, alongside a hand-dispatched `scroll` event and a
 * hand-edited `scrollHeight` standing in for content that grew.
 *
 * Here the box really overflows, the scroll really happens, and the content
 * really grows, so the attributes answer to layout rather than to the case.
 */

/** A fixed-height scroller whose content height the case controls. */
function Probe({ initial }: { initial: number }) {
	const attach = useScrollOverflow()

	const [extra, setExtra] = useState(0)

	return (
		<div>
			<button type="button" data-testid="grow" onClick={() => setExtra(400)}>
				grow
			</button>

			<button type="button" data-testid="shrink" onClick={() => setExtra(0)}>
				shrink
			</button>

			<div ref={attach} data-testid="scroller" style={{ height: 200, overflowY: 'auto' }}>
				<div style={{ height: initial + extra }} />
			</div>
		</div>
	)
}

/** A fixed-height scroller whose second child mounts on demand. */
function AppendProbe() {
	const attach = useScrollOverflow()

	const [second, setSecond] = useState(false)

	return (
		<div>
			<button type="button" data-testid="append" onClick={() => setSecond(true)}>
				append
			</button>

			<div ref={attach} data-testid="scroller" style={{ height: 200, overflowY: 'auto' }}>
				<div style={{ height: 150 }} />

				{second && <div style={{ height: 400 }} />}
			</div>
		</div>
	)
}

/** The scroller node, once painted. */
function scroller(): HTMLElement {
	return present(screen.getByTestId('scroller'), 'the scroller')
}

/** `[above, below]` as the hook currently has them stamped. */
function edges(): [boolean, boolean] {
	const el = scroller()

	return [el.hasAttribute('data-overflow-above'), el.hasAttribute('data-overflow-below')]
}

describe('useScrollOverflow against a real scroller', () => {
	it('stamps neither edge when the content fits', async () => {
		renderUI(<Probe initial={150} />)

		await frames()

		expect(edges()).toEqual([false, false])

		// `toggleAttribute(…, false)` adds nothing, so an unstamped node reads the
		// same whether the hook measured it and found a fit or never measured it at
		// all. Drive the round trip: the edge that arrives and then leaves proves
		// the reading above is a measurement and not a silence.
		screen.getByTestId('grow').click()

		await waitFor(() => expect(edges()).toEqual([false, true]))

		screen.getByTestId('shrink').click()

		await waitFor(() => expect(edges()).toEqual([false, false]))
	})

	it('stamps the lower edge on attach when the content overflows', async () => {
		renderUI(<Probe initial={400} />)

		await waitFor(() => expect(edges()).toEqual([false, true]))
	})

	it('flips the edges as the box scrolls between them', async () => {
		renderUI(<Probe initial={400} />)

		const el = scroller()

		await waitFor(() => expect(edges()).toEqual([false, true]))

		// Mid-travel: content behind both edges.
		el.scrollTop = 100

		await waitFor(() => expect(edges()).toEqual([true, true]))

		// The bottom: 200 of travel in a 400 box with a 200 viewport.
		el.scrollTop = 200

		await waitFor(() => expect(edges()).toEqual([true, false]))

		el.scrollTop = 0

		await waitFor(() => expect(edges()).toEqual([false, true]))
	})

	it('re-measures when the content grows under it', async () => {
		renderUI(<Probe initial={150} />)

		await frames()

		expect(edges()).toEqual([false, false])

		// A real child grows the content past the viewport, with no scroll to prompt
		// the hook. The child keeps its identity, so this is the per-child resize
		// observer's to catch: the mutation observer watches `childList` and sees
		// nothing, and the scroller itself is pinned at its own height.
		screen.getByTestId('grow').click()

		await waitFor(() => expect(edges()).toEqual([false, true]))
	})

	it('re-measures when a child mounts into it', async () => {
		renderUI(<AppendProbe />)

		await frames()

		expect(edges()).toEqual([false, false])

		// A new child grows the content, and no observed box changes size: the
		// scroller is pinned at its own height, and the first child keeps its
		// own. So the mutation observer is the one path that sees it.
		screen.getByTestId('append').click()

		await waitFor(() => expect(edges()).toEqual([false, true]))
	})

	it('unstamps both edges and stops listening once the ref detaches', async () => {
		const { unmount, container } = renderUI(<Probe initial={400} />)

		const el = scroller()

		await waitFor(() => expect(edges()).toEqual([false, true]))

		el.scrollTop = 100

		await waitFor(() => expect(edges()).toEqual([true, true]))

		// Detaching runs the callback ref's cleanup: the attributes come off, and
		// a later scroll must not restamp them through a listener left behind.
		unmount()

		expect(el.hasAttribute('data-overflow-above')).toBe(false)

		expect(el.hasAttribute('data-overflow-below')).toBe(false)

		// Put the node back in the document before prompting it. Detached, it
		// reports `scrollTop`, `clientHeight` and `scrollHeight` as zero, so a
		// listener left behind would compute both edges false and the assertion
		// below would hold whether or not one survived the cleanup.
		document.body.append(el)

		el.scrollTop = 100

		el.dispatchEvent(new Event('scroll'))

		await frames()

		expect(el.hasAttribute('data-overflow-above')).toBe(false)

		expect(el.hasAttribute('data-overflow-below')).toBe(false)

		el.remove()

		expect(container.isConnected).toBe(true)
	})
})

/** A fixed-width scroller, 600 wide in a 200 viewport, on the axis the case sets. */
function WideProbe({ axis, dir }: { axis?: ScrollOverflowOptions['axis']; dir?: 'rtl' }) {
	const attach = useScrollOverflow({ axis })

	return (
		<div dir={dir}>
			<div
				ref={attach}
				data-testid="scroller"
				style={{ width: 200, height: 200, overflow: 'auto' }}
			>
				<div style={{ width: 600, height: 400 }} />
			</div>
		</div>
	)
}

/** `[start, end]` as the hook currently has them stamped. */
function inlineEdges(): [boolean, boolean] {
	const el = scroller()

	return [el.hasAttribute('data-overflow-start'), el.hasAttribute('data-overflow-end')]
}

describe('useScrollOverflow on the horizontal axis against a real scroller', () => {
	it('stamps no horizontal edge on the default vertical axis', async () => {
		renderUI(<WideProbe />)

		// The vertical edge arrives, so the hook measured the box. The box also
		// overflows sideways, and the default axis must not report it.
		await waitFor(() => expect(edges()).toEqual([false, true]))

		expect(inlineEdges()).toEqual([false, false])
	})

	it('flips the start and end edges as the box scrolls left to right', async () => {
		renderUI(<WideProbe axis="horizontal" />)

		const el = scroller()

		await waitFor(() => expect(inlineEdges()).toEqual([false, true]))

		// The horizontal axis alone: the box overflows downward too.
		expect(edges()).toEqual([false, false])

		el.scrollLeft = 200

		await waitFor(() => expect(inlineEdges()).toEqual([true, true]))

		// The end: 400 of travel in a 600 box with a 200 viewport.
		el.scrollLeft = 400

		await waitFor(() => expect(inlineEdges()).toEqual([true, false]))
	})

	it('reads the logical edges in a right-to-left scroller', async () => {
		renderUI(<WideProbe axis="horizontal" dir="rtl" />)

		const el = scroller()

		await waitFor(() => expect(inlineEdges()).toEqual([false, true]))

		// A right-to-left scroller starts at zero and travels negative.
		el.scrollLeft = -400

		await waitFor(() => expect(inlineEdges()).toEqual([true, false]))
	})

	it('stamps all four edges on both axes, and clears them on detach', async () => {
		const { unmount } = renderUI(<WideProbe axis="both" />)

		const el = scroller()

		await waitFor(() => expect([...edges(), ...inlineEdges()]).toEqual([false, true, false, true]))

		el.scrollTop = 200

		el.scrollLeft = 400

		await waitFor(() => expect([...edges(), ...inlineEdges()]).toEqual([true, false, true, false]))

		unmount()

		const stamped = ['above', 'below', 'start', 'end'].filter((edge) =>
			el.hasAttribute(`data-overflow-${edge}`),
		)

		expect(stamped).toEqual([])
	})
})
