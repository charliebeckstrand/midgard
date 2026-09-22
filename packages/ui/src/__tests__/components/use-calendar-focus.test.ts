import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useCalendarFocus } from '../../components/calendar/use-calendar-focus'
import { attach, makeKeyEvent, present } from '../helpers'

function makeContainer(buttonCount: number) {
	const el = document.createElement('div')

	for (let i = 0; i < buttonCount; i++) {
		const btn = document.createElement('button')

		btn.textContent = String(i)

		btn.setAttribute('tabindex', '0')

		el.appendChild(btn)
	}

	return attach(el)
}

function setup(
	options: {
		cols?: number
		stopPropagation?: boolean
		footer?: boolean
		headerButtons?: number
		gridButtons?: number
		footerButtons?: number
	} = {},
) {
	const header = makeContainer(options.headerButtons ?? 3)

	const grid = makeContainer(options.gridButtons ?? 14)

	const footer = options.footer ? makeContainer(options.footerButtons ?? 2) : null

	const { result } = renderHook(() =>
		useCalendarFocus({
			headerRef: { current: header },
			gridRef: { current: grid },
			footerRef: footer ? { current: footer } : undefined,
			cols: options.cols ?? 7,
			stopPropagation: options.stopPropagation ?? false,
		}),
	)

	return { header, grid, footer, ...result.current }
}

describe('useCalendarFocus: header', () => {
	it('ArrowDown moves focus from header to the first grid button', () => {
		const { header, grid, handleHeaderKeyDown } = setup()

		const event = makeKeyEvent('ArrowDown')

		handleHeaderKeyDown(event)

		expect(event.preventDefault).toHaveBeenCalled()

		expect(document.activeElement).toBe(grid.querySelector('button'))

		// sanity: focus leaves the header
		expect(header.contains(document.activeElement)).toBe(false)
	})

	it('stopPropagation propagates to header events when configured', () => {
		const { handleHeaderKeyDown } = setup({ stopPropagation: true })

		const event = makeKeyEvent('ArrowDown')

		handleHeaderKeyDown(event)

		expect(event.stopPropagation).toHaveBeenCalled()
	})
})

describe('useCalendarFocus: grid', () => {
	it('ArrowUp from the top row focuses the middle header button', () => {
		const { header, grid, handleGridKeyDown } = setup({ cols: 7, gridButtons: 14 })

		// Top row = first `cols` buttons. Focus index 0.
		const first = present<HTMLButtonElement>(grid.querySelector('button'), 'button')

		first.focus()

		const event = makeKeyEvent('ArrowUp')

		handleGridKeyDown(event)

		expect(event.preventDefault).toHaveBeenCalled()

		const headerButtons = header.querySelectorAll('button')

		expect(document.activeElement).toBe(headerButtons.item(Math.floor(headerButtons.length / 2)))
	})

	it('ArrowDown from the bottom row focuses the first footer button when footer is provided', () => {
		const { grid, footer, handleGridKeyDown } = setup({
			cols: 7,
			gridButtons: 14,
			footer: true,
		})

		const buttons = grid.querySelectorAll('button')

		const lastRowFirst = buttons.item(buttons.length - 7) as HTMLButtonElement

		lastRowFirst.focus()

		const event = makeKeyEvent('ArrowDown')

		handleGridKeyDown(event)

		expect(document.activeElement).toBe(footer?.querySelector('button'))
	})

	it('ArrowDown from the bottom row keeps focus inside the grid when there is no footer', () => {
		const { grid, handleGridKeyDown } = setup({ cols: 7, gridButtons: 14 })

		const buttons = grid.querySelectorAll('button')

		const last = buttons.item(buttons.length - 1) as HTMLButtonElement

		last.focus()

		handleGridKeyDown(makeKeyEvent('ArrowDown'))

		// With no footer, the calendar delegates to the roving grid handler, which
		// keeps focus inside the grid rather than escaping to another zone.
		expect(grid.contains(document.activeElement)).toBe(true)
	})
})

describe('useCalendarFocus: footer', () => {
	it('ArrowUp moves focus back to the last grid button', () => {
		const { grid, footer, handleFooterKeyDown } = setup({ footer: true })

		const footerFirst = present<HTMLButtonElement>(footer?.querySelector('button'), 'button')

		footerFirst.focus()

		const event = makeKeyEvent('ArrowUp')

		handleFooterKeyDown(event)

		expect(event.preventDefault).toHaveBeenCalled()

		const buttons = grid.querySelectorAll('button')

		expect(document.activeElement).toBe(buttons.item(buttons.length - 1))
	})

	it('ArrowRight wraps to the first footer button', () => {
		const { footer, handleFooterKeyDown } = setup({ footer: true, footerButtons: 2 })

		const buttons = footer?.querySelectorAll('button')

		;(buttons?.item(1) as HTMLButtonElement | undefined)?.focus()

		handleFooterKeyDown(makeKeyEvent('ArrowRight'))

		expect(document.activeElement).toBe(buttons?.item(0))
	})

	it('ArrowLeft wraps to the last footer button', () => {
		const { footer, handleFooterKeyDown } = setup({ footer: true, footerButtons: 2 })

		const buttons = footer?.querySelectorAll('button')

		;(buttons?.item(0) as HTMLButtonElement | undefined)?.focus()

		handleFooterKeyDown(makeKeyEvent('ArrowLeft'))

		expect(document.activeElement).toBe(buttons?.item(1))
	})

	it('ArrowLeft is a no-op when focus is outside the footer', () => {
		const { handleFooterKeyDown } = setup({ footer: true })

		const event = makeKeyEvent('ArrowLeft')

		handleFooterKeyDown(event)

		expect(event.preventDefault).not.toHaveBeenCalled()
	})

	it('ignores non-arrow keys in the footer handler', () => {
		const { handleFooterKeyDown } = setup({ footer: true })

		const event = makeKeyEvent('a')

		handleFooterKeyDown(event)

		expect(event.preventDefault).not.toHaveBeenCalled()
	})

	it('stopPropagation propagates from footer ArrowUp when configured', () => {
		const { footer, handleFooterKeyDown } = setup({ footer: true, stopPropagation: true })

		;(footer?.querySelector('button') as HTMLButtonElement | undefined)?.focus()

		const event = makeKeyEvent('ArrowUp')

		handleFooterKeyDown(event)

		expect(event.stopPropagation).toHaveBeenCalled()
	})

	it('stopPropagation propagates from footer ArrowRight when configured', () => {
		const { footer, handleFooterKeyDown } = setup({
			footer: true,
			footerButtons: 2,
			stopPropagation: true,
		})

		;(footer?.querySelector('button') as HTMLButtonElement | undefined)?.focus()

		const event = makeKeyEvent('ArrowRight')

		handleFooterKeyDown(event)

		expect(event.stopPropagation).toHaveBeenCalled()
	})

	it('treats a missing footerRef as no footer for keyboard navigation', () => {
		// `footerRef` is optional; passing it as undefined leaves the inner
		// `(footerRef?.current ?? null)` chain on the nullish branch rather
		// than throwing.
		const grid = makeContainer(14)

		const header = makeContainer(3)

		const { result } = renderHook(() =>
			useCalendarFocus({ headerRef: { current: header }, gridRef: { current: grid } }),
		)

		expect(() => result.current.handleFooterKeyDown(makeKeyEvent('ArrowLeft'))).not.toThrow()
	})
})

describe('useCalendarFocus: stopPropagation paths', () => {
	it('stopPropagation propagates from header keydown when the roving handler prevents default', () => {
		const { header, handleHeaderKeyDown } = setup({ stopPropagation: true })

		present<HTMLButtonElement>(header.querySelector('button'), 'button').focus()

		// ArrowRight goes through the header roving handler, which calls
		// preventDefault; that's the path line 82 guards.
		const event = makeKeyEvent('ArrowRight')

		handleHeaderKeyDown(event)

		expect(event.stopPropagation).toHaveBeenCalled()
	})

	it('does not stopPropagation from header keydown when the roving handler is a no-op', () => {
		const { handleHeaderKeyDown } = setup({ stopPropagation: true })

		// 'a' has no roving binding, so preventDefault is never called and
		// the late `defaultPrevented` guard leaves stopPropagation alone.
		const event = makeKeyEvent('a')

		handleHeaderKeyDown(event)

		expect(event.stopPropagation).not.toHaveBeenCalled()
	})

	it('stopPropagation propagates from ArrowUp at the top row of the grid when configured', () => {
		const { grid, handleGridKeyDown } = setup({ cols: 7, gridButtons: 14, stopPropagation: true })

		present<HTMLButtonElement>(grid.querySelector('button'), 'button').focus()

		const event = makeKeyEvent('ArrowUp')

		handleGridKeyDown(event)

		expect(event.stopPropagation).toHaveBeenCalled()
	})

	it('stopPropagation propagates from ArrowDown at the bottom row when a footer is present', () => {
		const { grid, handleGridKeyDown } = setup({
			cols: 7,
			gridButtons: 14,
			footer: true,
			stopPropagation: true,
		})

		const buttons = grid.querySelectorAll('button')

		;(buttons.item(buttons.length - 7) as HTMLButtonElement).focus()

		const event = makeKeyEvent('ArrowDown')

		handleGridKeyDown(event)

		expect(event.stopPropagation).toHaveBeenCalled()
	})

	it('stopPropagation propagates from grid keydown when the roving handler prevents default', () => {
		const { grid, handleGridKeyDown } = setup({ cols: 7, gridButtons: 14, stopPropagation: true })

		// Mid-grid focus: ArrowRight hits the roving grid handler, which calls
		// preventDefault and triggers the late `defaultPrevented` guard.
		const buttons = grid.querySelectorAll('button')

		;(buttons.item(3) as HTMLButtonElement).focus()

		const event = makeKeyEvent('ArrowRight')

		handleGridKeyDown(event)

		expect(event.stopPropagation).toHaveBeenCalled()
	})
})
