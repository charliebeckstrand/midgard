import { render } from '@testing-library/react'
import { createRef, type Ref } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { useFloatingReference } from '../../hooks/use-floating-reference'

function Probe({
	setReference,
	triggerRef,
	childRef,
}: {
	setReference: (node: HTMLElement | null) => void
	triggerRef?: Ref<HTMLButtonElement>
	childRef?: Ref<HTMLButtonElement>
}) {
	const ref = useFloatingReference(setReference, triggerRef, childRef)

	return <button ref={ref} type="button" />
}

describe('useFloatingReference', () => {
	it('gives the node to the reference setter and to each own ref', () => {
		const setReference = vi.fn()

		const triggerRef = createRef<HTMLButtonElement>()

		const childRef = vi.fn()

		const { container } = render(
			<Probe setReference={setReference} triggerRef={triggerRef} childRef={childRef} />,
		)

		const node = container.querySelector('button')

		expect(setReference).toHaveBeenCalledWith(node)

		expect(triggerRef.current).toBe(node)

		expect(childRef).toHaveBeenCalledWith(node)
	})

	it('nulls the own refs on unmount, and gives no null to the reference setter', () => {
		const setReference = vi.fn()

		const triggerRef = createRef<HTMLButtonElement>()

		const childRef = vi.fn()

		const { unmount } = render(
			<Probe setReference={setReference} triggerRef={triggerRef} childRef={childRef} />,
		)

		unmount()

		expect(triggerRef.current).toBeNull()

		expect(childRef).toHaveBeenLastCalledWith(null)

		expect(setReference).not.toHaveBeenCalledWith(null)
	})

	it('runs the cleanup of a React 19 child ref on unmount, and gives no null to it', () => {
		const cleanup = vi.fn()

		const childRef = vi.fn(() => cleanup)

		const triggerRef = createRef<HTMLButtonElement>()

		const { unmount } = render(
			<Probe setReference={vi.fn()} triggerRef={triggerRef} childRef={childRef} />,
		)

		unmount()

		expect(cleanup).toHaveBeenCalledTimes(1)

		expect(childRef).not.toHaveBeenCalledWith(null)

		expect(triggerRef.current).toBeNull()
	})
})
