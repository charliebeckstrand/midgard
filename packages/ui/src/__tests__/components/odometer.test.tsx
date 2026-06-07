import { afterEach, describe, expect, it, vi } from 'vitest'
import { Odometer } from '../../components/odometer'
import { bySlot, renderUI, waitFor } from '../helpers'

describe('Odometer', () => {
	afterEach(() => {
		vi.restoreAllMocks()
	})

	const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

	it('renders the initial value using the default formatter', () => {
		const { container } = renderUI(<Odometer value={1234} />)

		expect(bySlot(container, 'odometer')).toHaveTextContent('1,234')
	})

	it('applies a custom format function', () => {
		const { container } = renderUI(<Odometer value={42} format={(n) => `${Math.round(n)} pts`} />)

		expect(bySlot(container, 'odometer')).toHaveTextContent('42 pts')
	})

	it('snaps immediately when duration is 0', () => {
		const { container, rerender } = renderUI(<Odometer value={0} duration={0} />)

		rerender(<Odometer value={500} duration={0} />)

		expect(bySlot(container, 'odometer')).toHaveTextContent('500')
	})

	it('animates toward the new value', async () => {
		const { container, rerender } = renderUI(<Odometer value={0} duration={50} />)

		rerender(<Odometer value={100} duration={50} />)

		await waitFor(() => {
			expect(bySlot(container, 'odometer')).toHaveTextContent('100')
		})
	})

	it('exposes the settled value as an image label, not a live region', () => {
		const { container } = renderUI(<Odometer value={1234} />)

		const el = bySlot(container, 'odometer')

		// No live region: the per-frame tween must not be announced.
		expect(el).not.toHaveAttribute('aria-live')

		expect(el).toHaveAttribute('role', 'img')

		// The label reflects the final target, regardless of the animated digits.
		expect(el).toHaveAttribute('aria-label', '1,234')
	})

	it('passes through HTML attributes', () => {
		const { container } = renderUI(<Odometer value={0} id="score" />)

		expect(bySlot(container, 'odometer')).toHaveAttribute('id', 'score')
	})

	it('cancels the running animation when unmounted', async () => {
		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

		const { rerender, unmount } = renderUI(<Odometer value={0} duration={80} />)

		rerender(<Odometer value={1000} duration={80} />)

		unmount()

		await wait(120)

		expect(errorSpy).not.toHaveBeenCalled()
	})
})
