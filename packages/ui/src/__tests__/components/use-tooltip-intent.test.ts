import { act, renderHook } from '@testing-library/react'
import { describe, expect, vi } from 'vitest'
import { useTooltipIntent } from '../../components/tooltip/use-tooltip-intent'
import { attach } from '../helpers'
import { it } from '../helpers/fake-clock'

/** A trigger that matches `:focus-visible`, as a keyboard focus makes it. jsdom does not match it for a programmatic focus. */
function keyboardTrigger(): HTMLButtonElement {
	const node = document.createElement('button')

	const matches = node.matches.bind(node)

	vi.spyOn(node, 'matches').mockImplementation(
		(selector) => selector === ':focus-visible' || matches(selector),
	)

	return attach(node)
}

/** Focuses the trigger. The first focus starts the tooltip state, which is a React update. */
function focus(node: HTMLElement): void {
	act(() => node.focus())
}

function pressEscape(node: HTMLElement): void {
	node.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
}

/** The intent that the trigger records before the tooltip state loads. */
describe('useTooltipIntent', () => {
	it('does not replay a focus that Escape dismissed', () => {
		const node = keyboardTrigger()

		const { result } = renderHook(() => useTooltipIntent({ enabled: true, trigger: 'hover' }))

		result.current.setReference(node)

		focus(node)

		pressEscape(node)

		expect(result.current.takeIntent().focus).toBeNull()
	})

	it('records the focus again when focus leaves and comes back after Escape', async ({ clock }) => {
		const node = keyboardTrigger()

		const { result } = renderHook(() => useTooltipIntent({ enabled: true, trigger: 'hover' }))

		result.current.setReference(node)

		focus(node)

		pressEscape(node)

		node.blur()

		await clock.runAll()

		focus(node)

		expect(result.current.takeIntent().focus).not.toBeNull()
	})

	it('keeps the focus intent for a key other than Escape', () => {
		const node = keyboardTrigger()

		const { result } = renderHook(() => useTooltipIntent({ enabled: true, trigger: 'hover' }))

		result.current.setReference(node)

		focus(node)

		node.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))

		expect(result.current.takeIntent().focus).not.toBeNull()
	})

	it('starts the tooltip state on the first focus, and not before', () => {
		const node = keyboardTrigger()

		const { result } = renderHook(() => useTooltipIntent({ enabled: true, trigger: 'hover' }))

		result.current.setReference(node)

		expect(result.current.started).toBe(false)

		focus(node)

		expect(result.current.started).toBe(true)
	})

	it('starts the tooltip state on the first hover, also from a touch', () => {
		const node = attach(document.createElement('button'))

		const { result } = renderHook(() => useTooltipIntent({ enabled: true, trigger: 'hover' }))

		result.current.setReference(node)

		act(() => {
			node.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'touch' }))
		})

		expect(result.current.started).toBe(true)
	})

	it('starts the tooltip state when `open` holds an enabled tooltip, and keeps it', () => {
		const { result, rerender } = renderHook(
			({ enabled, held }: { enabled: boolean; held: boolean }) =>
				useTooltipIntent({ enabled, trigger: 'hover', held }),
			{ initialProps: { enabled: false, held: true } },
		)

		expect(result.current.started).toBe(false)

		rerender({ enabled: true, held: true })

		expect(result.current.started).toBe(true)

		rerender({ enabled: true, held: false })

		expect(result.current.started).toBe(true)
	})
})
