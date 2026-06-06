import { renderHook } from '@testing-library/react'
import { createRef } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { useA11yAutoFocus } from '../../hooks/a11y/use-a11y-auto-focus'

function mountTarget() {
	const el = document.createElement('button')

	document.body.append(el)

	const ref = createRef<HTMLElement | null>()

	ref.current = el

	return { el, ref }
}

afterEach(() => {
	document.body.innerHTML = ''
})

describe('useA11yAutoFocus', () => {
	it('focuses the target when `when` is true', () => {
		const { el, ref } = mountTarget()

		renderHook(() => useA11yAutoFocus(ref, true))

		expect(document.activeElement).toBe(el)
	})

	it('does not focus when `when` is false', () => {
		const { el, ref } = mountTarget()

		renderHook(() => useA11yAutoFocus(ref, false))

		expect(document.activeElement).not.toBe(el)
	})

	it('focuses once `when` flips true', () => {
		const { el, ref } = mountTarget()

		const { rerender } = renderHook(({ when }) => useA11yAutoFocus(ref, when), {
			initialProps: { when: false },
		})

		expect(document.activeElement).not.toBe(el)

		rerender({ when: true })

		expect(document.activeElement).toBe(el)
	})
})
