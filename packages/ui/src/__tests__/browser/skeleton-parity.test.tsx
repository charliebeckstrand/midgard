import { describe, expect, it } from 'vitest'
import { Button, ButtonSkeleton } from '../../components/button'
import { ColorPanel, ColorPanelSkeleton } from '../../components/color'
import { ToggleIconButton, ToggleIconButtonSkeleton } from '../../components/toggle-icon-button'
import { present, renderUI } from '../helpers'

/**
 * A skeleton reserves the box of the component that replaces it, so the swap moves nothing. This
 * measures the real component and its skeleton at each size step.
 *
 * Rides the real browser because the claim is a computed one: jsdom loads no stylesheet.
 */
const box = (el: Element | null | undefined, what: string) => {
	const rect = present(el, what).getBoundingClientRect()

	return { height: rect.height, width: rect.width }
}

const placeholder = (container: HTMLElement) =>
	box(container.querySelector('[data-slot="placeholder"]'), 'skeleton')

describe('skeleton parity (real browser)', () => {
	it.each(['xs', 'sm', 'md', 'lg'] as const)(
		'ButtonSkeleton has the height of a %s button',
		(size) => {
			const real = box(
				renderUI(<Button size={size}>Save</Button>).container.querySelector('button'),
				'button',
			)

			expect(placeholder(renderUI(<ButtonSkeleton size={size} />).container).height).toBe(
				real.height,
			)
		},
	)

	it.each(['xs', 'sm', 'md', 'lg'] as const)(
		'ToggleIconButtonSkeleton has the box of a %s toggle',
		(size) => {
			const real = box(
				renderUI(
					<ToggleIconButton size={size} aria-label="Pin" icon={<svg data-slot="icon" />} />,
				).container.querySelector('button'),
				'toggle',
			)

			expect(
				placeholder(renderUI(<ToggleIconButtonSkeleton size={size} />).container),
			).toStrictEqual(real)
		},
	)

	it.each(['sm', 'md', 'lg'] as const)('ColorPanelSkeleton has the box of a %s panel', (size) => {
		const real = box(
			renderUI(<ColorPanel size={size} defaultValue="#3b82f6" />).container.firstElementChild,
			'color panel',
		)

		const skeleton = placeholder(renderUI(<ColorPanelSkeleton size={size} />).container)

		expect(skeleton.width).toBe(real.width)

		// The panel height has a fraction of a pixel from its text lines.
		expect(Math.abs(skeleton.height - real.height)).toBeLessThan(1)
	})
})
