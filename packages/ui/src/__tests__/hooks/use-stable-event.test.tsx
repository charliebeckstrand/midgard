import { act, render, renderHook } from '@testing-library/react'
import { useLayoutEffect, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { useStableEvent } from '../../hooks/use-stable-event'

describe('useStableEvent', () => {
	it('keeps one identity across renders', () => {
		const { result, rerender } = renderHook(({ handler }) => useStableEvent(handler), {
			initialProps: { handler: () => 1 },
		})

		const first = result.current

		rerender({ handler: () => 2 })

		expect(result.current).toBe(first)
	})

	it('calls the handler of the newest commit', () => {
		const one = vi.fn()
		const two = vi.fn()

		const { result, rerender } = renderHook(({ handler }) => useStableEvent(handler), {
			initialProps: { handler: one },
		})

		const held = result.current

		rerender({ handler: two })

		act(() => held('x'))

		expect(one).not.toHaveBeenCalled()

		expect(two).toHaveBeenCalledWith('x')
	})

	// A child's layout effect runs before its parent's. The event must reach the
	// newest handler there too, as an effect event does.
	it('calls the newest handler from a child layout effect', () => {
		const seen: number[] = []

		// No dependency list: the effect runs after each commit.
		function Child({ report }: { report: () => void }) {
			useLayoutEffect(() => {
				report()
			})

			return null
		}

		let bump = () => {}

		function Parent() {
			const [tick, setTick] = useState(0)

			bump = () => setTick((n) => n + 1)

			const report = useStableEvent(() => {
				seen.push(tick)
			})

			return <Child report={report} />
		}

		render(<Parent />)

		act(() => bump())

		expect(seen).toEqual([0, 1])
	})

	it('throws when render calls it', () => {
		function Caller() {
			const event = useStableEvent(() => 1)

			event()

			return null
		}

		vi.spyOn(console, 'error').mockImplementation(() => {})

		expect(() => render(<Caller />)).toThrow()
	})
})
