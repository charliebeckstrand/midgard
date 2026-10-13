import { beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { Toast, ToastProvider } from '../../components/toast'
import { LocaleProvider } from '../../providers/locale'
import { present, renderUI, waitFor } from '../helpers'

/**
 * A `start` or `end` position follows the reading direction. In a
 * right-to-left region, the end is the left edge of the screen.
 */
describe('Toast logical positions (real browser)', () => {
	// The positions apply from the `sm` breakpoint up.
	beforeAll(() => page.viewport(960, 640))

	it.each([
		['bottom-end', 'ltr', 'right'],
		['bottom-end', 'rtl', 'left'],
		['top-start', 'ltr', 'left'],
		['top-start', 'rtl', 'right'],
	] as const)('docks %s under %s on the %s edge', async (position, dir, edge) => {
		renderUI(
			<LocaleProvider dir={dir}>
				<ToastProvider>
					<Toast position={position} />
				</ToastProvider>
			</LocaleProvider>,
		)

		await waitFor(() => {
			const viewport = present(
				document.querySelector<HTMLElement>('[data-slot="toast-viewport"]'),
				'viewport',
			)

			const box = viewport.getBoundingClientRect()

			const gap = edge === 'left' ? box.left : window.innerWidth - box.right

			expect(Math.abs(gap)).toBeLessThan(1)
		})
	})
})
