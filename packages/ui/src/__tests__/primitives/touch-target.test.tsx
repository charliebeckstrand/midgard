import { describe, expect, it, vi } from 'vitest'
import { TouchTarget } from '../../primitives/touch-target'
import { fireEvent, present, renderUI, screen } from '../helpers'

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
		expect(touchArea?.className).toContain('[--touch-target-floor:1.5rem]')

		expect(touchArea?.className).toContain('pointer-coarse:[--touch-target-floor:2.75rem]')

		expect(touchArea?.className).not.toContain('pointer-fine:hidden')
	})

	it('caps each axis at the host plus the gap that a container states, else at the floor', () => {
		const { container } = renderUI(
			<TouchTarget>
				<span>Target</span>
			</TouchTarget>,
		)

		const touchArea = container.querySelector('[data-slot="touch-target"]')

		// Without the gap of an axis, the fallback is the floor, and the cap is a no-op.
		expect(touchArea?.className).toContain(
			'w-[max(100%,min(var(--touch-target-floor),100%_+_var(--touch-target-gap-x,var(--touch-target-floor))))]',
		)

		expect(touchArea?.className).toContain(
			'h-[max(100%,min(var(--touch-target-floor),100%_+_var(--touch-target-gap-y,var(--touch-target-floor))))]',
		)
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

		const touchArea = present(
			container.querySelector('[aria-hidden="true"]'),
			'[aria-hidden="true"]',
		)

		fireEvent.click(touchArea)

		expect(onClick).toHaveBeenCalled()
	})
})
