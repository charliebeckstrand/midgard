import { render } from '@testing-library/react'
import { createRef, type Ref } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { useComposedRef } from '../../hooks/use-composed-ref'

function Probe({ refs }: { refs: (Ref<HTMLDivElement> | undefined)[] }) {
	const composed = useComposedRef(...refs)

	return <div ref={composed} data-slot="probe" />
}

describe('useComposedRef', () => {
	it('attaches the node to every provided ref, object or function', () => {
		const objectRef = createRef<HTMLDivElement>()

		const functionRef = vi.fn()

		const { container } = render(<Probe refs={[objectRef, functionRef, undefined]} />)

		const node = container.querySelector('[data-slot="probe"]')

		expect(objectRef.current).toBe(node)

		expect(functionRef).toHaveBeenCalledWith(node)
	})

	it('rewires when an input ref swaps identity: the old target detaches, the new one attaches', () => {
		const first = createRef<HTMLDivElement>()

		const second = createRef<HTMLDivElement>()

		const { container, rerender } = render(<Probe refs={[first]} />)

		const node = container.querySelector('[data-slot="probe"]')

		expect(first.current).toBe(node)

		// Swapping an input ref re-runs the wiring with standard React
		// detach/attach semantics; a callback memoized once would leave the
		// replacement ref stale (never receiving the node).
		rerender(<Probe refs={[second]} />)

		expect(first.current).toBeNull()

		expect(second.current).toBe(node)
	})

	it('runs the cleanup of a React 19 callback ref on detach, and gives no null to it', () => {
		const cleanup = vi.fn()

		const callbackRef = vi.fn(() => cleanup)

		const { unmount } = render(<Probe refs={[callbackRef]} />)

		unmount()

		expect(cleanup).toHaveBeenCalledTimes(1)

		expect(callbackRef).not.toHaveBeenCalledWith(null)
	})

	it('returns null when every ref is absent', () => {
		let composed: unknown

		function Absent() {
			composed = useComposedRef<HTMLDivElement>(undefined, undefined)

			return null
		}

		render(<Absent />)

		expect(composed).toBeNull()
	})
})
