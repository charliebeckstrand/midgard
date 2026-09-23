import { afterEach, describe, expect, it } from 'vitest'
import { __resetAnnouncer, announce } from '../../core/announcer'

const flush = () => new Promise<void>((resolve) => queueMicrotask(resolve))

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

		await flush()

		expect(regionBy('polite')).toHaveTextContent('Saved')
	})

	it('routes assertive messages to the assertive region', async () => {
		announce('Stop', { assertive: true })

		await flush()

		expect(regionBy('assertive')).toHaveTextContent('Stop')

		expect(regionBy('polite')).toBeNull()
	})

	it('reuses a single region per politeness across calls', async () => {
		announce('one')

		await flush()

		announce('two')

		await flush()

		expect(
			document.body.querySelectorAll('[data-slot="live-region"][aria-live="polite"]'),
		).toHaveLength(1)

		expect(regionBy('polite')).toHaveTextContent('two')
	})

	it('changes the region text when the same message repeats', async () => {
		announce('Copied')

		await flush()

		const first = regionBy('polite')?.textContent

		announce('Copied')

		await flush()

		const second = regionBy('polite')?.textContent

		announce('Copied')

		await flush()

		// A live region speaks only a real change, so each repeat must differ from the text before it.
		expect(first).toBe('Copied')

		expect(second).toBe('Copied\u00A0')

		expect(regionBy('polite')?.textContent).toBe('Copied')
	})

	it('ignores an empty message', async () => {
		announce('')

		await flush()

		expect(regionBy('polite')).toBeNull()
	})
})
