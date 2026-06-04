import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useAnnounce } from '../../hooks/use-announce'

const flush = () => act(async () => await Promise.resolve())

function regionsBy(politeness: 'polite' | 'assertive') {
	return document.body.querySelectorAll<HTMLElement>(
		`[data-slot="live-region"][aria-live="${politeness}"]`,
	)
}

describe('useAnnounce', () => {
	it('mounts a single shared polite and assertive region', () => {
		const first = renderHook(() => useAnnounce())

		const second = renderHook(() => useAnnounce())

		expect(regionsBy('polite')).toHaveLength(1)

		expect(regionsBy('assertive')).toHaveLength(1)

		first.unmount()

		second.unmount()
	})

	it('removes the region once the last consumer unmounts', () => {
		const { unmount } = renderHook(() => useAnnounce())

		expect(regionsBy('polite')).toHaveLength(1)

		unmount()

		expect(regionsBy('polite')).toHaveLength(0)
	})

	it('writes a polite message into the polite region', async () => {
		const { result, unmount } = renderHook(() => useAnnounce())

		act(() => result.current('Saved'))

		await flush()

		expect(regionsBy('polite')[0]).toHaveTextContent('Saved')

		unmount()
	})

	it('routes assertive messages to the assertive region', async () => {
		const { result, unmount } = renderHook(() => useAnnounce())

		act(() => result.current('Stop', { assertive: true }))

		await flush()

		expect(regionsBy('assertive')[0]).toHaveTextContent('Stop')

		expect(regionsBy('polite')[0]).toHaveTextContent('')

		unmount()
	})
})
