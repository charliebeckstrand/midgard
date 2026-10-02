import { describe, expect, it } from 'vitest'
import { Alert } from '../../../components/alert'
import { Banner } from '../../../components/banner'
import { DensityProvider } from '../../../providers/density'
import { present, renderUI } from '../../helpers'
import { HALF_PIXEL } from '../../helpers/geometry/tolerance'

/**
 * The leading icon and the close button of an Alert line up with the title.
 * The title of an Alert keeps one size at each density step, so the icon must
 * also keep one size. The close button sits on the title row, also when the
 * description wraps to more lines.
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
	it('keeps the leading icon at one size at each density step', () => {
		const snug = renderUI(
			<DensityProvider density="snug">
				<Alert severity="info" title="Scheduled maintenance" />
			</DensityProvider>,
		)

		const compact = renderUI(
			<DensityProvider density="compact">
				<Alert severity="info" title="Scheduled maintenance" />
			</DensityProvider>,
		)

		const snugIcon = boxOf(snug.container, '[data-slot="icon"]')

		const compactIcon = boxOf(compact.container, '[data-slot="icon"]')

		expect(snugIcon.width).toBeGreaterThan(0)

		expect(compactIcon.width).toBe(snugIcon.width)
	})

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
