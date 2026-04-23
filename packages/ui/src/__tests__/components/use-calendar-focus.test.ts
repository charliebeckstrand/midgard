import { renderHook } from '@testing-library/react'
import type { KeyboardEvent } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCalendarFocus } from '../../components/calendar/use-calendar-focus'

function makeContainer(buttonCount: number) {
	const el = document.createElement('div')

	for (let i = 0; i < buttonCount; i++) {
		const btn = document.createElement('button')
		btn.textContent = String(i)
		btn.setAttribute('tabindex', '0')
		el.appendChild(btn)
	}

	document.body.appendChild(el)

	return el
}

function makeEvent(key: string) {
	return {
		key,
		preventDefault: vi.fn(),
		stopPropagation: vi.fn(),
		defaultPrevented: false,
	} as unknown as KeyboardEvent
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
	beforeEach(() => {
		document.body.innerHTML = ''
	})

	it('ArrowDown moves focus from header to the first grid button', () => {
		const { header, grid, handleHeaderKeyDown } = setup()

		const event = makeEvent('ArrowDown')

		handleHeaderKeyDown(event)

		expect(event.preventDefault).toHaveBeenCalled()

		expect(document.activeElement).toBe(grid.querySelector('button'))

		// sanity: header was not touched
		expect(header.contains(document.activeElement)).toBe(false)
	})

	it('stopPropagation propagates to header events when configured', () => {
		const { handleHeaderKeyDown } = setup({ stopPropagation: true })

		const event = makeEvent('ArrowDown')

		handleHeaderKeyDown(event)

		expect(event.stopPropagation).toHaveBeenCalled()
	})
})

describe('useCalendarFocus: grid', () => {
	beforeEach(() => {
		document.body.innerHTML = ''
	})

	it('ArrowUp from the top row focuses the middle header button', () => {
		const { header, grid, handleGridKeyDown } = setup({ cols: 7, gridButtons: 14 })

		// Top row = first `cols` buttons. Focus index 0.
		const first = grid.querySelector('button') as HTMLButtonElement

		first.focus()

		const event = makeEvent('ArrowUp')

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

		const event = makeEvent('ArrowDown')

		handleGridKeyDown(event)

		expect(document.activeElement).toBe(footer?.querySelector('button'))
	})

	it('ArrowDown from the bottom row keeps focus inside the grid when there is no footer', () => {
		const { grid, handleGridKeyDown } = setup({ cols: 7, gridButtons: 14 })

		const buttons = grid.querySelectorAll('button')

		const last = buttons.item(buttons.length - 1) as HTMLButtonElement

		last.focus()

		handleGridKeyDown(makeEvent('ArrowDown'))

		// With no footer, the calendar delegates to the roving grid handler, which
		// keeps focus inside the grid rather than escaping to another zone.
		expect(grid.contains(document.activeElement)).toBe(true)
	})
})

describe('useCalendarFocus: footer', () => {
	beforeEach(() => {
		document.body.innerHTML = ''
	})

	it('ArrowUp moves focus back to the last grid button', () => {
		const { grid, footer, handleFooterKeyDown } = setup({ footer: true })

		const footerFirst = footer?.querySelector('button') as HTMLButtonElement

		footerFirst.focus()

		const event = makeEvent('ArrowUp')

		handleFooterKeyDown(event)

		expect(event.preventDefault).toHaveBeenCalled()

		const buttons = grid.querySelectorAll('button')

		expect(document.activeElement).toBe(buttons.item(buttons.length - 1))
	})

	it('ArrowRight wraps to the first footer button', () => {
		const { footer, handleFooterKeyDown } = setup({ footer: true, footerButtons: 2 })

		const buttons = footer?.querySelectorAll('button')

		;(buttons?.item(1) as HTMLButtonElement).focus()

		handleFooterKeyDown(makeEvent('ArrowRight'))

		expect(document.activeElement).toBe(buttons?.item(0))
	})

	it('ArrowLeft wraps to the last footer button', () => {
		const { footer, handleFooterKeyDown } = setup({ footer: true, footerButtons: 2 })

		const buttons = footer?.querySelectorAll('button')

		;(buttons?.item(0) as HTMLButtonElement).focus()

		handleFooterKeyDown(makeEvent('ArrowLeft'))

		expect(document.activeElement).toBe(buttons?.item(1))
	})

	it('ArrowLeft is a no-op when focus is outside the footer', () => {
		const { handleFooterKeyDown } = setup({ footer: true })

		const event = makeEvent('ArrowLeft')

		handleFooterKeyDown(event)

		expect(event.preventDefault).not.toHaveBeenCalled()
	})
})
