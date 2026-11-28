import { beforeAll, describe, expect, it } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { BarChart } from '../../../modules/chart/bar-chart'
import { getSlot, renderUI, screen, waitFor } from '../../helpers'
import { tooltipAfterHover } from '../helpers/tooltip'

/**
 * The truncation reveal of the spark veil (WCAG 1.4.10, 1.4.4). At the spark
 * tier the title shows in a veil over the marks, and a narrow chart cuts a long
 * title to one line. The veil takes no pointer, so a hover of the title cannot
 * open a tooltip. The veil shows the full title in a tooltip while it shows,
 * and Escape puts both away. The jsdom suite sees no overflow and mocks
 * `@floating-ui/react`, so the reveal shows only here.
 */
describe('spark veil truncation tooltip (real browser)', () => {
	beforeAll(() => page.viewport(900, 700))

	const data = [
		{ q: 'Q1', rev: 40 },
		{ q: 'Q2', rev: 55 },
	]

	const LONG = 'Revenue and cost by quarter'

	function Spark({ title }: { title: string }) {
		return (
			<>
				<BarChart
					aria-label="Rev"
					data={data}
					series={[{ xKey: 'q', yKey: 'rev' }]}
					title={title}
					width={120}
				/>
				<p data-testid="away">Away</p>
			</>
		)
	}

	it('shows the full title in a tooltip while a hover shows the veil', async () => {
		const { container } = renderUI(<Spark title={LONG} />)

		const veil = await waitFor(() => getSlot(container, 'chart-header'))

		await userEvent.hover(getSlot(container, 'chart'))

		await waitFor(() => expect(getComputedStyle(veil).opacity).toBe('1'))

		const tip = await screen.findByRole('tooltip')

		expect(tip).toHaveTextContent(LONG)

		// Escape puts the veil away, and its reveal goes with it.
		await userEvent.keyboard('{Escape}')

		await expect.poll(() => screen.queryByRole('tooltip')).toBeNull()

		await userEvent.hover(screen.getByTestId('away'))
	})

	// The inline header of a framed tier keeps the hover reveal of each line.
	it('shows the full title of a cut inline header on a hover of the title', async () => {
		const title = 'Revenue and cost by quarter for every region of the north and the south'

		const { container } = renderUI(
			<>
				<div style={{ width: 320 }}>
					<BarChart
						aria-label="Rev"
						data={data}
						series={[{ xKey: 'q', yKey: 'rev' }]}
						title={title}
						aspectRatio={16 / 9}
					/>
				</div>
				<p data-testid="away">Away</p>
			</>,
		)

		const line = await waitFor(() => getSlot(container, 'chart-title'))

		await userEvent.hover(line)

		const tip = await screen.findByRole('tooltip')

		expect(tip).toHaveTextContent(title)

		await userEvent.hover(screen.getByTestId('away'))
	})

	it('opens no tooltip while the veil shows a title that fits', async () => {
		const { container } = renderUI(<Spark title="Rev" />)

		await waitFor(() => getSlot(container, 'chart-header'))

		await userEvent.hover(getSlot(container, 'chart'))

		expect(await tooltipAfterHover()).toBeNull()

		await userEvent.hover(screen.getByTestId('away'))
	})
})
