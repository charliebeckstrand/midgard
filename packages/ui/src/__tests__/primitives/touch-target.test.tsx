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

	it.for([
		{
			// 24px floor (WCAG 2.5.8) everywhere, raised to 44px (2.5.5) on coarse
			// pointers; `max(100%, …)` collapses onto hosts already at the floor.
			name: 'floors the hit area at both pointer minimums without hiding on fine pointers',
			contains: ['[--touch-target-floor:1.5rem]', 'pointer-coarse:[--touch-target-floor:2.75rem]'],
			omits: ['pointer-fine:hidden'],
		},
		{
			// Without the gap of an axis, the fallback is the floor, and the cap is a no-op.
			name: 'caps each axis at the host plus the gap that a container states, else at the floor',
			contains: [
				'w-[max(100%,min(var(--touch-target-floor),100%_+_var(--touch-target-gap-x,var(--touch-target-floor))))]',
				'h-[max(100%,min(var(--touch-target-floor),100%_+_var(--touch-target-gap-y,var(--touch-target-floor))))]',
			],
			omits: [],
		},
		{
			name: 'keeps the expansion area interactive so it can capture taps',
			contains: ['pointer-events-auto'],
			omits: [],
		},
	])('$name', ({ contains, omits }) => {
		const { container } = renderUI(
			<TouchTarget>
				<span>Target</span>
			</TouchTarget>,
		)

		const touchArea = container.querySelector('[data-slot="touch-target"]')

		for (const className of contains) expect(touchArea?.className).toContain(className)

		for (const className of omits) expect(touchArea?.className).not.toContain(className)
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
