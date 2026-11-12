import { afterEach, describe, expect, it } from 'vitest'
import { cdp } from 'vitest/browser'
import { inset } from '../../recipes/kumi/panel'

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
 */

/** The plain descendants of the element whose state changes. */
const DESCENDANTS = 500

type TraceEvent = { name: string; args?: { elementCount?: number } }

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

	change()

	getComputedStyle(probe).marginTop

	await session.send('Tracing.end')
	await complete

	session.off('Tracing.dataCollected', collect)

	return events
		.filter((event) => event.name === 'UpdateLayoutTree')
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
