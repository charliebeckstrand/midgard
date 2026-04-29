import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TimeAgo } from '../../components/time-ago'
import { act, bySlot, renderUI } from '../helpers'

const SEC = 1000
const MIN = 60 * SEC
const HOUR = 60 * MIN
const DAY = 24 * HOUR

describe('TimeAgo', () => {
	beforeEach(() => {
		vi.useFakeTimers()

		vi.setSystemTime(new Date('2026-04-29T12:00:00Z'))
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it('renders a <time> element with data-slot="time-ago"', () => {
		const { container } = renderUI(<TimeAgo date={new Date()} />)

		const el = bySlot(container, 'time-ago')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('TIME')
	})

	it('sets the dateTime attribute to the ISO string', () => {
		const date = new Date('2026-04-29T11:30:00Z')

		const { container } = renderUI(<TimeAgo date={date} />)

		expect(bySlot(container, 'time-ago')).toHaveAttribute('dateTime', date.toISOString())
	})

	it('renders a relative string for past timestamps', () => {
		const past = new Date(Date.now() - 5 * MIN)

		const { container } = renderUI(<TimeAgo date={past} locale="en-US" />)

		expect(bySlot(container, 'time-ago')?.textContent).toBe('5 minutes ago')
	})

	it('renders a relative string for future timestamps', () => {
		const future = new Date(Date.now() + 3 * HOUR)

		const { container } = renderUI(<TimeAgo date={future} locale="en-US" />)

		expect(bySlot(container, 'time-ago')?.textContent).toBe('in 3 hours')
	})

	it('accepts ISO strings and numeric timestamps', () => {
		const past = Date.now() - 2 * DAY

		const { container } = renderUI(<TimeAgo date={past} locale="en-US" />)

		expect(bySlot(container, 'time-ago')?.textContent).toBe('2 days ago')
	})

	it('exposes the absolute time as title by default', () => {
		const date = new Date('2026-04-29T11:30:00Z')

		const { container } = renderUI(<TimeAgo date={date} locale="en-US" />)

		expect(bySlot(container, 'time-ago')).toHaveAttribute('title', date.toLocaleString('en-US'))
	})

	it('omits title when title={false}', () => {
		const { container } = renderUI(<TimeAgo date={new Date()} title={false} />)

		expect(bySlot(container, 'time-ago')).not.toHaveAttribute('title')
	})

	it('uses a string title when provided', () => {
		const { container } = renderUI(<TimeAgo date={new Date()} title="custom" />)

		expect(bySlot(container, 'time-ago')).toHaveAttribute('title', 'custom')
	})

	it('applies a custom format function', () => {
		const past = new Date(Date.now() - 90 * SEC)

		const { container } = renderUI(<TimeAgo date={past} format={(ms) => `${Math.round(ms)}ms`} />)

		expect(bySlot(container, 'time-ago')?.textContent).toBe('-90000ms')
	})

	it('updates as time passes', () => {
		const past = new Date(Date.now() - 1 * MIN)

		const { container } = renderUI(<TimeAgo date={past} locale="en-US" />)

		expect(bySlot(container, 'time-ago')?.textContent).toBe('1 minute ago')

		act(() => {
			vi.advanceTimersByTime(60 * SEC)
		})

		expect(bySlot(container, 'time-ago')?.textContent).toBe('2 minutes ago')
	})

	it('honors an explicit interval', () => {
		const past = new Date(Date.now() - 1 * MIN)

		const setInterval = vi.spyOn(window, 'setInterval')

		renderUI(<TimeAgo date={past} interval={1000} />)

		expect(setInterval).toHaveBeenCalledWith(expect.any(Function), 1000)

		setInterval.mockRestore()
	})

	it('forwards HTML attributes to the time element', () => {
		const { container } = renderUI(<TimeAgo date={new Date()} id="ts" className="custom" />)

		const el = bySlot(container, 'time-ago')

		expect(el).toHaveAttribute('id', 'ts')

		expect(el?.className).toContain('custom')
	})
})
