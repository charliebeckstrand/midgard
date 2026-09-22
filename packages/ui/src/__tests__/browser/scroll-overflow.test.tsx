import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { useScrollOverflow } from '../../hooks/use-scroll-overflow'
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
