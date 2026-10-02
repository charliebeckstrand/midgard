import { beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import type { ComponentApi } from '../../../docs/engine/api-reference'
import { Axes, DemoApiContext } from '../../../docs/engine/components/axes'
import { renderUI, waitFor } from '../../helpers'

const api: ComponentApi[] = [
	{
		name: 'Badge',
		props: [{ name: 'variant', type: "'solid' | 'outline'", default: "'solid'" }],
	},
]

/** A fulfilled promise that `use()` reads with no suspend. */
function settled<T>(value: T): Promise<T> {
	return Object.assign(Promise.resolve(value), { status: 'fulfilled', value })
}

/**
 * A captioned axis instance with a fixed width and `max-w-full` fits a row that
 * is narrower than that width. The stack aligns each instance to the start, so
 * the caption wrapper takes the width of its content. Without a cap on the
 * wrapper, `max-w-full` on the instance resolves against that width, and the
 * frame scrolls. Intrinsic sizes need a layout engine, so this rides the real
 * browser.
 */
describe('Axes instance width (real browser)', () => {
	beforeAll(() => page.viewport(390, 800))

	it('keeps a fixed-width instance within a narrow frame', async () => {
		const { container } = renderUI(
			<div className="w-80">
				<DemoApiContext value={settled(api)}>
					<Axes
						of="Badge"
						render={(props) => (
							<div data-slot="probe" className="w-96 max-w-full" {...props}>
								Probe
							</div>
						)}
					/>
				</DemoApiContext>
			</div>,
		)

		await waitFor(() =>
			expect(container.querySelectorAll('[data-slot="axis-value"]').length).toBe(2),
		)

		for (const section of container.querySelectorAll<HTMLElement>('[data-example-section]')) {
			expect(section.scrollWidth).toBe(section.clientWidth)
		}

		for (const instance of container.querySelectorAll<HTMLElement>('[data-slot="axis-value"]')) {
			const section = instance.closest<HTMLElement>('[data-example-section]')

			expect(instance.getBoundingClientRect().right).toBeLessThanOrEqual(
				(section?.getBoundingClientRect().right ?? 0) - 16,
			)
		}
	})
})
