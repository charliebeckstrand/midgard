import { useEffect, useRef } from 'react'
import { beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { Toast, ToastProvider, useToast } from '../../components/toast'
import { type DensityStep, densitySteps } from '../../core/density'
import { renderUI, waitFor } from '../helpers'
import { holdRoot } from './helpers/root-state'

/** The space between two stacked toasts at each root step: the `sm` stop of `dan.gap.scale`. */
const GAP_PX: Record<DensityStep, number> = { xs: 2, sm: 4, md: 8, lg: 12, xl: 18 }

/** The width of a toast card at each root step: `dan.size.toast.width`. */
const WIDTH_PX: Record<DensityStep, number> = { xs: 256, sm: 288, md: 320, lg: 352, xl: 384 }

/** Shows two toasts once. A strict-mode effect runs twice, and the ref keeps the count at two. */
function Fire() {
	const { toast } = useToast()

	const fired = useRef(false)

	useEffect(() => {
		if (fired.current) return

		fired.current = true

		toast({ title: 'First', persist: true })

		toast({ title: 'Second', persist: true })
	}, [toast])

	return null
}

/**
 * The gap between two toasts and the width of each card step with the root
 * density, as the padding and the text of each card do. Rides the real browser
 * because jsdom loads no stylesheet.
 */
describe('Toast density (real browser)', () => {
	// The positions apply from the `sm` breakpoint up.
	beforeAll(() => page.viewport(960, 640))

	function renderStack(step: DensityStep) {
		holdRoot(step)

		renderUI(
			<ToastProvider>
				<Fire />
				<Toast position="top-right" />
			</ToastProvider>,
		)
	}

	it.each(densitySteps)('steps the gap between two toasts at the %s root step', async (step) => {
		renderStack(step)

		// The cards slide in, so the test waits for the stack to come to rest.
		await waitFor(() => {
			const cards = [...document.querySelectorAll<HTMLElement>('[data-slot="alert"]')]

			expect(cards).toHaveLength(2)

			const [upper, lower] = cards
				.map((card) => card.getBoundingClientRect())
				.sort((a, b) => a.top - b.top)

			expect((lower?.top ?? 0) - (upper?.bottom ?? 0)).toBeCloseTo(GAP_PX[step], 1)
		})
	})

	it.each(densitySteps)('steps the width of a card at the %s root step', async (step) => {
		renderStack(step)

		await waitFor(() => {
			const cards = [...document.querySelectorAll<HTMLElement>('[data-slot="alert"]')]

			expect(cards).toHaveLength(2)

			for (const card of cards) {
				expect(card.getBoundingClientRect().width).toBeCloseTo(WIDTH_PX[step], 1)
			}
		})
	})
})
