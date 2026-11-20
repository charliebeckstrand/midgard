import { afterEach, describe, expect, it } from 'vitest'
import { cdp } from 'vitest/browser'
import { dan } from '../../recipes/kiso'

const inset = dan.space.panel

/**
 * The inset of a panel body reads the `:first-child` or the `:last-child` state
 * of each ancestor of the body (`inset.first`, `inset.last`). When that state of
 * an element changes, Chromium must restyle only that element and each body in
 * it. Before, the selector put `*` as the subject in `:not()`, and Chromium
 * restyled each descendant of the element. A chart that unmounted its last
 * child thus restyled each element of its hidden data table.
 *
 * Each case puts the inset class on an element, so that the parent of the
 * element tracks the state of its children, and puts many plain descendants in
 * the element. Then it adds a sibling before the element, or removes the sibling
 * after it, and counts the elements that the next style recalculation restyles.
 * The `UpdateLayoutTree` trace event of Chromium gives that count.
 *
 * The trace records each renderer of the browser, and other files of the suite
 * run in other pages at the same time. A restyle in one of those pages also
 * gives an `UpdateLayoutTree` event. Thus the count includes only the events of
 * the frame of the test. A `TimeStamp` marker gives the identifier of that frame.
 *
 * The trace also runs while the case waits for the end of the trace, and the
 * frame of the test can restyle for another cause in that time, such as a frame
 * callback. On a loaded runner the wait is longer, and such a restyle came into
 * the count. Thus a second marker ends the change and the forced style, and the
 * count includes only the events between the two markers. The two markers and
 * the work between them run in one task, so no other work comes between them.
 */

/** The plain descendants of the element whose state changes. */
const DESCENDANTS = 500

/** The message of the marker that identifies the frame of the test in the trace. */
const MARKER = 'panel-inset-restyle'

/** The message of the marker that ends the change and the forced style. */
const END_MARKER = 'panel-inset-restyle-end'

type TraceEvent = {
	name: string
	/** The start of the event, in microseconds. */
	ts: number
	args?: {
		elementCount?: number
		beginData?: { frame?: string }
		data?: { frame?: string; message?: string }
	}
}

type Session = {
	send: (method: string, params?: object) => Promise<unknown>
	on: (event: string, listener: (payload: { value: TraceEvent[] }) => void) => void
	off: (event: string, listener: (payload: { value: TraceEvent[] }) => void) => void
}

/** Runs `change`, forces the style, and returns the number of elements that Chromium restyled. */
async function restyled(change: () => void, probe: Element): Promise<number> {
	const session = cdp() as unknown as Session
	const events: TraceEvent[] = []
	const collect = (payload: { value: TraceEvent[] }) => events.push(...payload.value)

	const complete = new Promise<void>((resolve) => {
		const done = () => {
			session.off('Tracing.tracingComplete', done)
			resolve()
		}

		session.on('Tracing.tracingComplete', done)
	})

	session.on('Tracing.dataCollected', collect)

	await session.send('Tracing.start', {
		traceConfig: {
			includedCategories: ['devtools.timeline', 'disabled-by-default-devtools.timeline'],
		},
		transferMode: 'ReportEvents',
	})

	console.timeStamp(MARKER)

	change()

	getComputedStyle(probe).marginTop

	console.timeStamp(END_MARKER)

	await session.send('Tracing.end')
	await complete

	session.off('Tracing.dataCollected', collect)

	const marker = (message: string) =>
		events.find((event) => event.name === 'TimeStamp' && event.args?.data?.message === message)

	const start = marker(MARKER)

	const end = marker(END_MARKER)

	const frame = start?.args?.data?.frame

	if (!start || !end || !frame) {
		throw new Error('The trace has no markers that identify the frame and the span of the test.')
	}

	return events
		.filter(
			(event) =>
				event.name === 'UpdateLayoutTree' &&
				event.args?.beginData?.frame === frame &&
				event.ts >= start.ts &&
				event.ts <= end.ts,
		)
		.reduce((sum, event) => sum + (event.args?.elementCount ?? 0), 0)
}

/** A parent that holds `target`, with the plain descendants in `target`, then `sibling`. */
function mount(className: string) {
	const parent = document.createElement('div')
	const target = document.createElement('div')
	const sibling = document.createElement('div')

	target.className = className

	for (let index = 0; index < DESCENDANTS; index++) {
		target.append(document.createElement('span'))
	}

	parent.append(target, sibling)
	document.body.append(parent)

	getComputedStyle(target).marginTop

	return { parent, target, sibling }
}

afterEach(() => {
	document.body.replaceChildren()
})

describe.each(['drawer', 'sheet'] as const)('the body inset of a %s', (panel) => {
	it('restyles only the element whose :first-child state changes', async () => {
		const { parent, target } = mount(inset.first[panel])

		const count = await restyled(() => parent.prepend(document.createElement('div')), target)

		expect(count).toBeLessThan(DESCENDANTS / 10)
	})

	it('restyles only the element whose :last-child state changes', async () => {
		const { target, sibling } = mount(inset.last[panel])

		const count = await restyled(() => sibling.remove(), target)

		expect(count).toBeLessThan(DESCENDANTS / 10)
	})
})
