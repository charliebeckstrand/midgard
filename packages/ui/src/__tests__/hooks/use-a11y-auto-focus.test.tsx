import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useA11yAutoFocus } from '../../hooks/a11y/use-a11y-auto-focus'
import { attach } from '../helpers'

function mountTarget() {
	return attach(document.createElement('button'))
}

describe('useA11yAutoFocus', () => {
	it('focuses the target when `when` is true', () => {
		const target = mountTarget()

		renderHook(() => useA11yAutoFocus(target, true))

		expect(document.activeElement).toBe(target)
	})

	it('does not focus when `when` is false', () => {
		const target = mountTarget()

		renderHook(() => useA11yAutoFocus(target, false))

		expect(document.activeElement).not.toBe(target)
	})

	it('focuses once `when` flips true', () => {
		const target = mountTarget()

		const { rerender } = renderHook(({ when }) => useA11yAutoFocus(target, when), {
			initialProps: { when: false },
		})

		expect(document.activeElement).not.toBe(target)

		rerender({ when: true })

		expect(document.activeElement).toBe(target)
	})

	// A portaled panel attaches a commit after `when` flips true. The hook must
	// follow the node that arrives, not read a ref once while it is still empty.
	it('focuses a target that attaches after `when` flips true', () => {
		const target = mountTarget()

		const { rerender } = renderHook(({ node }) => useA11yAutoFocus(node, true), {
			initialProps: { node: null as HTMLElement | null },
		})

		expect(document.activeElement).not.toBe(target)

		rerender({ node: target })

		expect(document.activeElement).toBe(target)
	})
})
