import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useComboboxTrigger } from '../../components/combobox/use-combobox-trigger'
import { makePointerEvent } from '../helpers'

function setup(open: boolean) {
	const close = vi.fn()
	const setOpen = vi.fn()
	const input = document.createElement('input')
	const focus = vi.spyOn(input, 'focus')
	const select = vi.spyOn(input, 'select')

	const { result } = renderHook(() =>
		useComboboxTrigger({
			open,
			close,
			setOpen,
			inputRef: { current: input },
		}),
	)

	return { handler: result.current.onMouseDown, close, setOpen, focus, select }
}

describe('useComboboxTrigger', () => {
	it('closes the panel and prevents default when open', () => {
		const { handler, close, setOpen } = setup(true)

		const event = makePointerEvent<HTMLElement>()

		handler(event)

		expect(event.preventDefault).toHaveBeenCalled()
		expect(close).toHaveBeenCalled()
		expect(setOpen).not.toHaveBeenCalled()
	})

	it('focuses and selects the input, then opens, when closed', () => {
		const { handler, close, setOpen, focus, select } = setup(false)

		const event = makePointerEvent<HTMLElement>()

		handler(event)

		expect(event.preventDefault).toHaveBeenCalled()
		expect(focus).toHaveBeenCalled()
		expect(select).toHaveBeenCalled()
		expect(setOpen).toHaveBeenCalledWith(true)
		expect(close).not.toHaveBeenCalled()
	})
})
