import { describe, expect, it, vi } from 'vitest'
import { TouchTarget } from '../../primitives/touch-target'
import { fireEvent, renderUI, screen } from '../helpers'

describe('TouchTarget', () => {
	it('renders its children', () => {
		renderUI(
			<TouchTarget>
				<span>Click me</span>
			</TouchTarget>,
		)

		expect(screen.getByText('Click me')).toBeInTheDocument()
	})

	it('renders an invisible touch area with aria-hidden', () => {
		const { container } = renderUI(
			<TouchTarget>
				<span>Target</span>
			</TouchTarget>,
		)

		const touchArea = container.querySelector('[aria-hidden="true"]')

		expect(touchArea).toBeInTheDocument()

		expect(touchArea?.tagName).toBe('SPAN')
	})

	it('floors the hit area at both pointer minimums without hiding on fine pointers', () => {
		const { container } = renderUI(
			<TouchTarget>
				<span>Target</span>
			</TouchTarget>,
		)

		const touchArea = container.querySelector('[aria-hidden="true"]')

		// 24px floor (WCAG 2.5.8) everywhere, raised to 44px (2.5.5) on coarse
		// pointers; `max(100%, …)` collapses onto hosts already at the floor.
		expect(touchArea?.className).toContain('size-[max(100%,1.5rem)]')

		expect(touchArea?.className).toContain('pointer-coarse:size-[max(100%,2.75rem)]')

		expect(touchArea?.className).not.toContain('pointer-fine:hidden')
	})

	it('keeps the expansion area interactive so it can capture taps', () => {
		const { container } = renderUI(
			<TouchTarget>
				<span>Target</span>
			</TouchTarget>,
		)

		const touchArea = container.querySelector('[aria-hidden="true"]')

		expect(touchArea?.className).toContain('pointer-events-auto')
	})

	it('forwards a tap on the expansion area to the interactive host', () => {
		const onClick = vi.fn()

		const { container } = renderUI(
			<button type="button" onClick={onClick}>
				<TouchTarget>
					<span>Target</span>
				</TouchTarget>
			</button>,
		)

		const touchArea = container.querySelector('[aria-hidden="true"]') as HTMLElement

		fireEvent.click(touchArea)

		expect(onClick).toHaveBeenCalled()
	})
})
