import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useA11yFocusReturn } from '../../hooks/a11y/use-a11y-focus-return'

function mountTrigger() {
	const wrapper = document.createElement('div')

	const button = document.createElement('button')

	wrapper.append(button)

	document.body.append(wrapper)

	return { wrapper, button }
}

afterEach(() => {
	document.body.innerHTML = ''
})

describe('useA11yFocusReturn', () => {
	it('restores focus to the captured trigger on close', () => {
		const { wrapper, button } = mountTrigger()

		const { result, rerender } = renderHook(({ open }) => useA11yFocusReturn(open), {
			initialProps: { open: true },
		})

		result.current.captureTrigger(wrapper)

		rerender({ open: false })

		expect(document.activeElement).toBe(button)
	})

	it('focuses the captured node itself when it has no focusable child', () => {
		const node = document.createElement('span')

		node.tabIndex = -1

		document.body.append(node)

		const { result, rerender } = renderHook(({ open }) => useA11yFocusReturn(open), {
			initialProps: { open: true },
		})

		result.current.captureTrigger(node)

		rerender({ open: false })

		expect(document.activeElement).toBe(node)
	})

	it('skips the restore when skipNextRefocus is called for that close', () => {
		const { wrapper, button } = mountTrigger()

		const { result, rerender } = renderHook(({ open }) => useA11yFocusReturn(open), {
			initialProps: { open: true },
		})

		result.current.captureTrigger(wrapper)

		result.current.skipNextRefocus()

		rerender({ open: false })

		expect(document.activeElement).not.toBe(button)
	})

	it('does not refocus when never opened', () => {
		const { wrapper, button } = mountTrigger()

		const { result, rerender } = renderHook(({ open }) => useA11yFocusReturn(open), {
			initialProps: { open: false },
		})

		result.current.captureTrigger(wrapper)

		rerender({ open: false })

		expect(document.activeElement).not.toBe(button)
	})
})
