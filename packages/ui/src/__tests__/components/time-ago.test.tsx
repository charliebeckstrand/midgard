import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TimeAgo } from '../../components/time-ago'
import { act, bySlot, fireEvent, renderUI } from '../helpers'

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
		// Unwind spies BEFORE uninstalling the clock — see
		// use-time-ago-relative-time.test.ts for why the order matters (a
		// setInterval spy taken under fake timers restores to a dead fake if
		// useRealTimers runs first, and vmThreads shares that global with every
		// later file in the worker).
		vi.restoreAllMocks()

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

	it('renders no tooltip by default', () => {
		const { container } = renderUI(<TimeAgo date={new Date()} locale="en-US" />)

		// Clicking a plain <time> wires no tooltip, so nothing opens.
		act(() => {
			fireEvent.click(bySlot(container, 'time-ago') as HTMLElement)
		})

		expect(bySlot(container, 'tooltip-content')).not.toBeInTheDocument()
	})

	it('omits the tooltip when absolute={false}', () => {
		const { container } = renderUI(<TimeAgo date={new Date()} absolute={false} />)

		act(() => {
			fireEvent.click(bySlot(container, 'time-ago') as HTMLElement)
		})

		expect(bySlot(container, 'tooltip-content')).not.toBeInTheDocument()
	})

	it('reveals the absolute time in a tooltip when absolute', () => {
		const date = new Date('2026-04-29T11:30:00Z')

		const { container } = renderUI(<TimeAgo date={date} locale="en-US" absolute />)

		// The <time> keeps its slot and doubles as the trigger; the absolute
		// time only mounts once the tooltip opens.
		act(() => {
			fireEvent.click(bySlot(container, 'time-ago') as HTMLElement)
		})

		expect(bySlot(container, 'tooltip-content')?.textContent).toBe(date.toLocaleString('en-US'))
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
	})

	it('forwards HTML attributes to the time element', () => {
		const { container } = renderUI(<TimeAgo date={new Date()} id="ts" className="custom" />)

		const el = bySlot(container, 'time-ago')

		expect(el).toHaveAttribute('id', 'ts')

		expect(el?.className).toContain('custom')
	})

	it('renders a plain <span> (not an empty <time>) when the date is invalid', () => {
		const { container } = renderUI(<TimeAgo date="not-a-date" />)

		const el = bySlot(container, 'time-ago')

		expect(el).toBeInTheDocument()

		// No machine-readable timestamp exists, so it must not be a <time>.
		expect(el?.tagName).toBe('SPAN')

		expect(el).not.toHaveAttribute('dateTime')
	})
})
