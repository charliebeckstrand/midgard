import { describe, expect } from 'vitest'
import { announce } from '../../core/announcer'
import { flushAnnouncer, liveRegion } from '../helpers'
import { it } from '../helpers/fake-clock'

// The microtasks only, for a test that fakes the timers.
const flushMicrotasks = () => new Promise<void>((resolve) => queueMicrotask(resolve))

describe('announce', () => {
	it('creates a polite live region on demand and writes to it', async () => {
		expect(liveRegion('polite')).not.toBeInTheDocument()

		announce('Saved')

		await flushAnnouncer()

		expect(liveRegion('polite')).toHaveTextContent('Saved')
	})

	it('routes assertive messages to the assertive region', async () => {
		announce('Stop', { assertive: true })

		await flushAnnouncer()

		expect(liveRegion('assertive')).toHaveTextContent('Stop')

		expect(liveRegion('polite')).toBeNull()
	})

	it('reuses a single region per politeness across calls', async () => {
		announce('one')

		await flushAnnouncer()

		announce('two')

		await flushAnnouncer()

		expect(
			document.body.querySelectorAll('[data-slot="live-region"][aria-live="polite"]'),
		).toHaveLength(1)

		expect(liveRegion('polite')).toHaveTextContent('two')
	})

	it('changes the region text when the same message repeats', async () => {
		announce('Copied')

		await flushAnnouncer()

		const first = liveRegion('polite')?.textContent

		announce('Copied')

		await flushAnnouncer()

		const second = liveRegion('polite')?.textContent

		announce('Copied')

		await flushAnnouncer()

		// A live region speaks only a real change, so each repeat must differ from the text before it.
		expect(first).toBe('Copied')

		expect(second).toBe('Copied\u00A0')

		expect(liveRegion('polite')?.textContent).toBe('Copied')
	})

	it('writes the first text 100ms after the next paint once it creates the region', async ({
		clock,
	}) => {
		announce('Saved')

		await flushMicrotasks()

		// A new region reaches the accessibility tree in the next rendering update. Text that
		// lands before that update is not spoken.
		expect(liveRegion('polite')).toBeEmptyDOMElement()

		await clock.nextFrame()

		expect(liveRegion('polite')).toBeEmptyDOMElement()

		// VoiceOver in Safari can miss text that lands less than 100ms after the region.
		await clock.advance(99)

		expect(liveRegion('polite')).toBeEmptyDOMElement()

		await clock.advance(1)

		expect(liveRegion('polite')).toHaveTextContent('Saved')
	})

	it('keeps the last text when a new region gets two messages before its first write', async ({
		clock,
	}) => {
		announce('one')
		announce('two')

		await flushMicrotasks()

		await clock.nextFrame()

		await clock.runPending()

		await flushMicrotasks()

		expect(liveRegion('polite')?.textContent).toBe('two')
	})

	it('ignores an empty message', async () => {
		announce('')

		await flushAnnouncer()

		expect(liveRegion('polite')).toBeNull()
	})
})
