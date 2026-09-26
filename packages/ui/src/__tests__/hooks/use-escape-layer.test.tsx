import { act, render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { useEscapeLayer } from '../../hooks/use-escape-layer'

function Layer({
	name,
	open,
	onDismiss,
	children,
}: {
	name: string
	open: boolean
	onDismiss: (name: string) => void
	children?: ReactNode
}) {
	useEscapeLayer({ open, onDismiss: () => onDismiss(name) })

	return <>{children}</>
}

function pressEscape() {
	act(() => {
		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
	})
}

describe('useEscapeLayer', () => {
	it('stacks a child over its parent when both open in one commit', () => {
		const onDismiss = vi.fn()

		render(
			<Layer name="parent" open onDismiss={onDismiss}>
				<Layer name="child" open onDismiss={onDismiss} />
			</Layer>,
		)

		pressEscape()

		expect(onDismiss.mock.calls).toEqual([['child']])
	})

	it('stacks a child over its parent when both open in one update', () => {
		const onDismiss = vi.fn()

		const tree = (open: boolean) => (
			<Layer name="parent" open={open} onDismiss={onDismiss}>
				<Layer name="child" open={open} onDismiss={onDismiss} />
			</Layer>
		)

		const { rerender } = render(tree(false))

		rerender(tree(true))

		pressEscape()

		expect(onDismiss.mock.calls).toEqual([['child']])
	})

	it('stacks a layer that opens later over one that opened earlier', () => {
		const onDismiss = vi.fn()

		const tree = (second: boolean) => (
			<>
				<Layer name="late" open={second} onDismiss={onDismiss} />
				<Layer name="early" open onDismiss={onDismiss} />
			</>
		)

		const { rerender } = render(tree(false))

		rerender(tree(true))

		pressEscape()

		expect(onDismiss.mock.calls).toEqual([['late']])
	})

	it('gives the top back to the parent once the child closes', () => {
		const onDismiss = vi.fn()

		const tree = (child: boolean) => (
			<Layer name="parent" open onDismiss={onDismiss}>
				<Layer name="child" open={child} onDismiss={onDismiss} />
			</Layer>
		)

		const { rerender } = render(tree(true))

		rerender(tree(false))

		pressEscape()

		expect(onDismiss.mock.calls).toEqual([['parent']])
	})
})
