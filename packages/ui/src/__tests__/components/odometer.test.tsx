import { describe, expect, it, vi } from 'vitest'
import { Odometer } from '../../components/odometer'
import { bySlot, renderUI, waitFor } from '../helpers'

describe('Odometer', () => {
	it('renders with data-slot="odometer"', () => {
		const { container } = renderUI(<Odometer value={0} />)

		const el = bySlot(container, 'odometer')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('SPAN')
	})

	it('applies custom className', () => {
		const { container } = renderUI(<Odometer value={0} className="custom" />)

		const el = bySlot(container, 'odometer')

		expect(el?.className).toContain('custom')
	})

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

	it('sets aria-live on the root element', () => {
		const { container } = renderUI(<Odometer value={0} />)

		expect(bySlot(container, 'odometer')).toHaveAttribute('aria-live', 'polite')
	})

	it('passes through HTML attributes', () => {
		const { container } = renderUI(<Odometer value={0} id="score" />)

		expect(bySlot(container, 'odometer')).toHaveAttribute('id', 'score')
	})

	it('cancels the running animation when unmounted', () => {
		const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame')

		const { rerender, unmount } = renderUI(<Odometer value={0} duration={500} />)

		rerender(<Odometer value={1000} duration={500} />)

		unmount()

		expect(cancelSpy).toHaveBeenCalled()

		cancelSpy.mockRestore()
	})
})
