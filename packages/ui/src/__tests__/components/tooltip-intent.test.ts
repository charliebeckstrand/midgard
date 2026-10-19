import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useTooltipIntent } from '../../components/tooltip/tooltip-intent'

/** A trigger that matches `:focus-visible`, as a keyboard focus makes it. jsdom does not match it for a programmatic focus. */
function keyboardTrigger(): HTMLButtonElement {
	const node = document.createElement('button')

	const matches = node.matches.bind(node)

	vi.spyOn(node, 'matches').mockImplementation(
		(selector) => selector === ':focus-visible' || matches(selector),
	)

	document.body.append(node)

	return node
}

function pressEscape(node: HTMLElement): void {
	node.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
}

/** The intent that the trigger records before the tooltip state loads. */
describe('useTooltipIntent', () => {
	afterEach(() => {
		document.body.replaceChildren()
	})

	it('does not replay a focus that Escape dismissed', () => {
		const node = keyboardTrigger()

		const { result } = renderHook(() => useTooltipIntent({ enabled: true, trigger: 'hover' }))

		result.current.setReference(node)

		node.focus()

		pressEscape(node)

		expect(result.current.takeIntent().focus).toBeNull()
	})

	it('records the focus again when focus leaves and comes back after Escape', () => {
		vi.useFakeTimers()

		const node = keyboardTrigger()

		const { result } = renderHook(() => useTooltipIntent({ enabled: true, trigger: 'hover' }))

		result.current.setReference(node)

		node.focus()

		pressEscape(node)

		node.blur()

		vi.runAllTimers()

		node.focus()

		expect(result.current.takeIntent().focus).not.toBeNull()
	})

	it('keeps the focus intent for a key other than Escape', () => {
		const node = keyboardTrigger()

		const { result } = renderHook(() => useTooltipIntent({ enabled: true, trigger: 'hover' }))

		result.current.setReference(node)

		node.focus()

		node.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))

		expect(result.current.takeIntent().focus).not.toBeNull()
	})
})
