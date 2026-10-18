import { afterEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import { __resetAnnouncer, announce } from '../../core/announcer'
import { tick } from '../helpers'

// The microtasks only, for a test that fakes the timers.
const flushMicrotasks = () => new Promise<void>((resolve) => queueMicrotask(resolve))

function regionBy(politeness: 'polite' | 'assertive') {
	return document.body.querySelector<HTMLElement>(
		`[data-slot="live-region"][aria-live="${politeness}"]`,
	)
}

describe('announce', () => {
	afterEach(__resetAnnouncer)

	it('creates a polite live region on demand and writes to it', async () => {
		expect(regionBy('polite')).not.toBeInTheDocument()

		announce('Saved')

		await tick()

		expect(regionBy('polite')).toHaveTextContent('Saved')
	})

	it('routes assertive messages to the assertive region', async () => {
		announce('Stop', { assertive: true })

		await tick()

		expect(regionBy('assertive')).toHaveTextContent('Stop')

		expect(regionBy('polite')).toBeNull()
	})

	it('reuses a single region per politeness across calls', async () => {
		announce('one')

		await tick()

		announce('two')

		await tick()

		expect(
			document.body.querySelectorAll('[data-slot="live-region"][aria-live="polite"]'),
		).toHaveLength(1)

		expect(regionBy('polite')).toHaveTextContent('two')
	})

	it('changes the region text when the same message repeats', async () => {
		announce('Copied')

		await tick()

		const first = regionBy('polite')?.textContent

		announce('Copied')

		await tick()

		const second = regionBy('polite')?.textContent

		announce('Copied')

		await tick()

		// A live region speaks only a real change, so each repeat must differ from the text before it.
		expect(first).toBe('Copied')

		expect(second).toBe('Copied\u00A0')

		expect(regionBy('polite')?.textContent).toBe('Copied')
	})

	it('writes the first text one task after it creates the region', async () => {
		vi.useFakeTimers()

		onTestFinished(() => {
			vi.useRealTimers()
		})

		announce('Saved')

		await flushMicrotasks()

		// A new region needs one task to reach the accessibility tree, or a screen reader misses the text.
		expect(regionBy('polite')).toBeEmptyDOMElement()

		vi.runOnlyPendingTimers()

		expect(regionBy('polite')).toHaveTextContent('Saved')
	})

	it('keeps the last text when a new region gets two messages before its first task', async () => {
		vi.useFakeTimers()

		onTestFinished(() => {
			vi.useRealTimers()
		})

		announce('one')
		announce('two')

		await flushMicrotasks()

		vi.runOnlyPendingTimers()

		await flushMicrotasks()

		expect(regionBy('polite')?.textContent).toBe('two')
	})

	it('ignores an empty message', async () => {
		announce('')

		await tick()

		expect(regionBy('polite')).toBeNull()
	})
})
