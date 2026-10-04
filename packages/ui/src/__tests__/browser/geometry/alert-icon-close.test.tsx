import { describe, expect, it } from 'vitest'
import { Alert } from '../../../components/alert'
import { Banner } from '../../../components/banner'
import { DensityProvider } from '../../../providers/density'
import { present, renderUI } from '../../helpers'
import { HALF_PIXEL } from '../../helpers/geometry/tolerance'

/**
 * The leading icon and the close button of an Alert line up with the title.
 * The title and the icon of an Alert take the step of the nearest density
 * scope, so the icon stays on the line of the title at each step. The close
 * button sits on the title row, also when the description wraps to more lines.
 */

const LONG =
	'The system will be offline on Sunday from 2am to 4am while the team moves the database to a new host.'

function boxOf(root: HTMLElement, selector: string): DOMRect {
	return present(root.querySelector(selector), selector).getBoundingClientRect()
}

function middleOf(box: DOMRect): number {
	return box.top + box.height / 2
}

describe('Alert icon and close button', () => {
	it('sizes the leading icon and the title by the density step', () => {
		const measure = (density: 'compact' | 'snug' | 'loose') => {
			const { container } = renderUI(
				<DensityProvider density={density}>
					<Alert severity="info" title="Scheduled maintenance" />
				</DensityProvider>,
			)

			const icon = boxOf(container, '[data-slot="icon"]')

			const title = present(container.querySelector('[data-slot="icon"] + div'), 'the title')

			expect(middleOf(icon)).toBeNear(middleOf(title.getBoundingClientRect()), HALF_PIXEL)

			return { icon: icon.width, title: Number.parseFloat(getComputedStyle(title).fontSize) }
		}

		const compact = measure('compact')

		const snug = measure('snug')

		const loose = measure('loose')

		expect(compact.icon).toBeLessThan(snug.icon)

		expect(snug.icon).toBeLessThan(loose.icon)

		expect(compact.title).toBeLessThan(snug.title)

		expect(snug.title).toBeLessThan(loose.title)
	})

	it.each(['compact', 'snug', 'loose'] as const)(
		'pads a severity alert with no close button the same on each side at %s',
		(density) => {
			const { container } = renderUI(
				<DensityProvider density={density}>
					<Alert severity="info" title="Scheduled maintenance" />
				</DensityProvider>,
			)

			const style = getComputedStyle(
				present(container.querySelector('[data-slot="alert"]'), 'alert'),
			)

			expect(Number.parseFloat(style.paddingRight)).toBeNear(
				Number.parseFloat(style.paddingLeft),
				HALF_PIXEL,
			)
		},
	)

	it.each([
		['Alert', Alert, 'alert'],
		['Banner', Banner, 'banner'],
	] as const)(
		'puts the %s close button on the title row when the description wraps',
		(_, Surface, slot) => {
			const { container } = renderUI(
				<div className="w-72">
					<Surface severity="info" title="Maintenance" description={LONG} closable />
				</div>,
			)

			const root = present(container.querySelector(`[data-slot="${slot}"]`), slot)

			const title = present(root.querySelector('[data-slot="icon"] + div'), 'the title')

			const close = boxOf(root, 'button[aria-label="Dismiss"]')

			// The description wraps, so a button in the middle of the surface misses the title.
			expect(root.getBoundingClientRect().height).toBeGreaterThan(close.height * 2)

			expect(middleOf(close)).toBeNear(middleOf(title.getBoundingClientRect()), HALF_PIXEL)
		},
	)
})
