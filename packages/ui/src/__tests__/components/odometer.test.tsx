import { animate } from 'motion'
import type { MotionValue } from 'motion/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Odometer } from '../../components/odometer'
import { LocaleProvider } from '../../providers/locale'
import { bySlot, renderUI, waitFor, withFakeTime } from '../helpers'

describe('Odometer', () => {
	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('renders the initial value using the default formatter', () => {
		const { container } = renderUI(<Odometer value={1234} />)

		expect(bySlot(container, 'odometer-display')).toHaveTextContent('1,234')
	})

	it('groups the default in the ambient locale', () => {
		const { container } = renderUI(
			<LocaleProvider locale="de-DE">
				<Odometer value={1234} />
			</LocaleProvider>,
		)

		expect(bySlot(container, 'odometer-display')).toHaveTextContent('1.234')

		expect(bySlot(container, 'odometer-value')).toHaveTextContent('1.234')
	})

	it('applies a custom format function', () => {
		const { container } = renderUI(<Odometer value={42} format={(n) => `${Math.round(n)} pts`} />)

		expect(bySlot(container, 'odometer-display')).toHaveTextContent('42 pts')
	})

	it('snaps immediately when duration is 0', async () => {
		const { container, rerender } = renderUI(<Odometer value={0} duration={0} />)

		rerender(<Odometer value={500} duration={0} />)

		expect(animate).not.toHaveBeenCalled()

		await waitFor(() => expect(bySlot(container, 'odometer-display')).toHaveTextContent('500'))
	})

	it('animates toward the new value', async () => {
		// Stub the single `animate` call to land the motion value on its target
		// synchronously and return controls with a no-op `stop`;
		// `mockImplementationOnce` keeps the call-through default for the unmount
		// case below.
		vi.mocked(animate).mockImplementationOnce(((value: MotionValue<number>, to: number) => {
			value.set(to)

			return { stop: vi.fn() }
		}) as unknown as typeof animate)

		const { container, rerender } = renderUI(<Odometer value={0} duration={50} />)

		rerender(<Odometer value={100} duration={50} />)

		// Motion writes the readout on the next frame, with no React render.
		await waitFor(() => expect(bySlot(container, 'odometer-display')).toHaveTextContent('100'))
	})

	it('exposes the settled value as text, not as an image or a live region', () => {
		const { container } = renderUI(<Odometer value={1234} />)

		const el = bySlot(container, 'odometer')

		// No live region: the per-frame tween must not be announced.
		expect(el).not.toHaveAttribute('aria-live')

		// A number is text, so AT must not announce it as an image.
		expect(el).not.toHaveAttribute('role')

		expect(el).not.toHaveAttribute('aria-label')

		expect(bySlot(container, 'odometer-display')).toHaveAttribute('aria-hidden', 'true')

		expect(bySlot(container, 'odometer-value')).toHaveTextContent('1,234')
	})

	it('drops a consumer role, so the root never becomes a live region', () => {
		const { container } = renderUI(<Odometer value={1234} role="status" />)

		expect(bySlot(container, 'odometer')).not.toHaveAttribute('role')
	})

	it('prints 0, not -0, for a value that rounds to negative zero', () => {
		const { container } = renderUI(<Odometer value={-0.3} />)

		expect(bySlot(container, 'odometer-display')).toHaveTextContent(/^0$/)

		expect(bySlot(container, 'odometer-value')).toHaveTextContent(/^0$/)
	})

	it('cancels the running animation when unmounted', async () => {
		await withFakeTime(async (clock) => {
			const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

			const { rerender, unmount } = renderUI(<Odometer value={0} duration={80} />)

			rerender(<Odometer value={1000} duration={80} />)

			unmount()

			// Drive the clock past the tween's 80ms duration; a leaked frame
			// callback would fire here and hit the spy.
			await clock.advance(120)

			expect(errorSpy).not.toHaveBeenCalled()
		})
	})
})
