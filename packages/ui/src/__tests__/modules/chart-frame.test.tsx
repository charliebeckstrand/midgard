import { createRef } from 'react'
import { describe, expect, it } from 'vitest'
import { ChartFrame } from '../../modules/chart/engine/chart-frame/frame'
import { ChartLegend } from '../../modules/chart/engine/chart-legend/legend'
import { bySlot, noop, renderUI, screen } from '../helpers'

function frame(width: number, extras?: Partial<Parameters<typeof ChartFrame>[0]>) {
	return (
		<ChartFrame
			aria-label="Revenue by quarter"
			ref={createRef<HTMLDivElement>()}
			width={width}
			height={240}
			reserve={null}
			legend={
				<ChartLegend
					items={[{ index: 0, label: 'Revenue', swatchClass: 'bg-blue-600', swatch: 'rect' }]}
					hidden={new Set()}
					onToggle={noop}
				/>
			}
			readout={() => ({
				categories: ['Q1', 'Q2'],
				rows: [
					{ label: 'Revenue', swatchClass: 'bg-blue-600', swatch: 'rect', values: ['1', '2'] },
				],
			})}
			tooltip={true}
			{...extras}
		>
			<rect data-slot="chart-mark" />
		</ChartFrame>
	)
}

describe('ChartFrame', () => {
	it('names the plot region and keeps the SVG decorative', () => {
		const { container } = renderUI(frame(400))

		const plot = bySlot(container, 'chart-plot')

		expect(plot).toHaveAttribute('role', 'img')

		expect(plot).toHaveAttribute('aria-label', 'Revenue by quarter')

		expect(plot?.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
	})

	it('keeps the legend and data table outside the image region', () => {
		const { container } = renderUI(frame(400))

		const plot = bySlot(container, 'chart-plot')

		expect(bySlot(container, 'chart-legend')).not.toBeNull()

		expect(plot?.contains(bySlot(container, 'chart-legend'))).toBe(false)

		expect(plot?.contains(bySlot(container, 'chart-table'))).toBe(false)

		// The hidden table carries the values the tooltip would show.
		expect(bySlot(container, 'chart-table')?.textContent).toContain('Q2')
	})

	it('renders the frame shell without an SVG until a width is known', () => {
		const { container } = renderUI(frame(0))

		expect(bySlot(container, 'chart-plot')?.querySelector('svg')).toBeNull()

		expect(bySlot(container, 'chart-table')).not.toBeNull()
	})

	it('omits the legend row when the chart passes none', () => {
		const { container } = renderUI(frame(400, { legend: null }))

		expect(bySlot(container, 'chart-legend')).toBeNull()
	})

	it('mounts a custom tooltip in place of the shared one, under the same gate', () => {
		const custom = <div data-slot="custom-tooltip" />

		const shown = renderUI(frame(400, { customTooltip: custom }))

		expect(bySlot(shown.container, 'custom-tooltip')).not.toBeNull()

		// The spark posture and a tooltip switched off stand the custom one down too.
		const spark = renderUI(frame(400, { customTooltip: custom, tier: 'spark' }))

		expect(bySlot(spark.container, 'custom-tooltip')).toBeNull()

		const off = renderUI(frame(400, { customTooltip: custom, tooltip: false }))

		expect(bySlot(off.container, 'custom-tooltip')).toBeNull()
	})

	it('keeps the wider gap of a color-scale rail beside the plot', () => {
		const panel = renderUI(frame(400, { legendPlacement: 'right' }))

		expect(bySlot(panel.container, 'chart-body')).toHaveClass('gap-2')

		const rail = renderUI(frame(400, { legendPlacement: 'right', rail: true }))

		expect(bySlot(rail.container, 'chart-body')).toHaveClass('gap-4')
	})

	it('draws no header for a title that names the context menu alone', () => {
		const drawn = renderUI(frame(400, { title: 'Revenue' }))

		expect(bySlot(drawn.container, 'chart-header')).not.toBeNull()

		const unheaded = renderUI(frame(400, { title: 'Revenue', heading: false }))

		expect(bySlot(unheaded.container, 'chart-header')).toBeNull()
	})

	it('names the figure of the plot and the legend from its visible title', () => {
		renderUI(frame(400, { title: 'Revenue', subtitle: 'By quarter' }))

		const figure = screen.getByRole('figure', { name: 'Revenue' })

		expect(figure).toHaveAttribute('data-slot', 'chart-figure')

		expect(figure).toContainElement(screen.getByRole('img', { name: 'Revenue by quarter' }))
	})

	it('leaves the figure unnamed when no title shows above the plot', () => {
		const { container } = renderUI(frame(400, { title: 'Revenue', heading: false }))

		expect(bySlot(container, 'chart-figure')).not.toHaveAttribute('aria-labelledby')

		const spark = renderUI(frame(400, { title: 'Revenue', tier: 'spark' }))

		expect(bySlot(spark.container, 'chart-figure')).not.toHaveAttribute('aria-labelledby')
	})
})
