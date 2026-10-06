import { act, render, renderHook } from '@testing-library/react'
import { Activity, StrictMode, Suspense, use, useLayoutEffect, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { useStableEvent } from '../../hooks/use-stable-event'

// React does not document the behavior that the hook uses. Each wrapper that
// `useEffectEvent` gives reads one cell, and React writes that cell on commit.
// These cases hold that behavior, so a React upgrade that changes it fails here.
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

	// Strict Mode renders twice and runs the effects twice. The first wrapper must
	// keep its identity and reach the newest handler.
	it('keeps one identity and calls the newest handler in Strict Mode', () => {
		const seen: number[] = []

		const events = new Set<() => void>()

		let bump = () => {}

		function Parent() {
			const [tick, setTick] = useState(0)

			bump = () => setTick((n) => n + 1)

			const event = useStableEvent(() => {
				seen.push(tick)
			})

			events.add(event)

			return null
		}

		render(
			<StrictMode>
				<Parent />
			</StrictMode>,
		)

		act(() => bump())

		expect(events.size).toBe(1)

		const [held] = events

		act(() => held?.())

		expect(seen).toEqual([1])
	})

	// React writes the cell on commit, not on render. A render that suspends does
	// not commit, so the event keeps the handler of the last commit.
	it('keeps the committed handler when a render suspends', async () => {
		const seen: string[] = []

		let held: (() => void) | undefined

		const pending = new Promise<never>(() => {})

		function Child({ label, wait }: { label: string; wait: boolean }) {
			held = useStableEvent(() => {
				seen.push(label)
			})

			if (wait) use(pending)

			return null
		}

		const { rerender } = render(
			<Suspense fallback={null}>
				<Child label="committed" wait={false} />
			</Suspense>,
		)

		await act(async () => {
			rerender(
				<Suspense fallback={null}>
					<Child label="suspended" wait />
				</Suspense>,
			)
		})

		act(() => held?.())

		expect(seen).toEqual(['committed'])
	})

	// A hidden Activity unmounts the effects of its subtree, but it still commits.
	// A held event must reach the newest handler while hidden and after it shows.
	it('calls the newest handler in a hidden Activity', () => {
		const seen: string[] = []

		let held: (() => void) | undefined

		function Child({ label }: { label: string }) {
			held = useStableEvent(() => {
				seen.push(label)
			})

			return null
		}

		const { rerender } = render(
			<Activity mode="visible">
				<Child label="visible" />
			</Activity>,
		)

		rerender(
			<Activity mode="hidden">
				<Child label="hidden" />
			</Activity>,
		)

		act(() => held?.())

		rerender(
			<Activity mode="visible">
				<Child label="shown" />
			</Activity>,
		)

		act(() => held?.())

		expect(seen).toEqual(['hidden', 'shown'])
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
