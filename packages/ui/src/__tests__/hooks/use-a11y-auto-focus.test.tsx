import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useA11yAutoFocus } from '../../hooks/a11y/use-a11y-auto-focus'
import { attach } from '../helpers'

function mountTarget() {
	return attach(document.createElement('button'))
}

describe('useA11yAutoFocus', () => {
	it('focuses the target when `when` is true', () => {
		const el = mountTarget()

		renderHook(() => useA11yAutoFocus(el, true))

		expect(document.activeElement).toBe(el)
	})

	it('does not focus when `when` is false', () => {
		const el = mountTarget()

		renderHook(() => useA11yAutoFocus(el, false))

		expect(document.activeElement).not.toBe(el)
	})

	it('focuses once `when` flips true', () => {
		const el = mountTarget()

		const { rerender } = renderHook(({ when }) => useA11yAutoFocus(el, when), {
			initialProps: { when: false },
		})

		expect(document.activeElement).not.toBe(el)

		rerender({ when: true })

		expect(document.activeElement).toBe(el)
	})

	// A portalled panel attaches a commit after `when` flips true. The hook must
	// follow the node that arrives, not read a ref once while it is still empty.
	it('focuses a target that attaches after `when` flips true', () => {
		const el = mountTarget()

		const { rerender } = renderHook(({ node }) => useA11yAutoFocus(node, true), {
			initialProps: { node: null as HTMLElement | null },
		})

		expect(document.activeElement).not.toBe(el)

		rerender({ node: el })

		expect(document.activeElement).toBe(el)
	})
})
