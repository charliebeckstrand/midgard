import { describe, expect, it } from 'vitest'
import { BarChart } from '../../modules/chart/bar-chart'
import { textureClass, textureStyle } from '../../modules/chart/chart-pattern-defs'
import { PieChart } from '../../modules/chart/pie-chart'
import { allBySlot, bySlot, renderUI } from '../helpers'

const DATA = [
	{ quarter: 'Q1', revenue: 40, cost: 25 },
	{ quarter: 'Q2', revenue: 80, cost: 30 },
	{ quarter: 'Q3', revenue: 65, cost: 35 },
]

function bar(texture?: boolean) {
	return renderUI(
		<BarChart
			aria-label="Revenue and cost by quarter"
			data={DATA}
			series={[
				{ xKey: 'quarter', yKey: 'revenue', yName: 'Revenue' },
				{ xKey: 'quarter', yKey: 'cost', yName: 'Cost' },
			]}
			width={400}
			texture={texture}
		/>,
	)
}

describe('texture fill helpers', () => {
	it('applies the tile fill in every mode when active', () => {
		const cls = textureClass(true, 'url(#tile)') || ''

		expect(cls).toContain('[fill:var(--chart-fill)]!')

		expect(cls).not.toContain('forced-colors:[fill:var(--chart-fill)]')

		expect(cls).toContain('forced-color-adjust-none')
	})

	it('confines the tile fill to forced-colors and print when inactive', () => {
		const cls = textureClass(false, 'url(#tile)') || ''

		expect(cls).toContain('forced-colors:[fill:var(--chart-fill)]!')

		expect(cls).toContain('print:[fill:var(--chart-fill)]!')
	})

	it('adds nothing without a tile fill', () => {
		expect(textureClass(true, undefined)).toBe(false)

		expect(textureStyle(undefined)).toBeUndefined()

		expect(textureStyle('url(#tile)')).toEqual({ '--chart-fill': 'url(#tile)' })
	})
})

describe('chart textures', () => {
	it('defines one tile per distinct slot and paints the marks when on', () => {
		const { container } = bar(true)

		const patterns = container.querySelectorAll('[data-slot="chart-patterns"] pattern')

		// Two series, two slots, two tiles.
		expect(patterns).toHaveLength(2)

		const barMark = allBySlot(container, 'chart-bar')[0] as HTMLElement

		expect(barMark.getAttribute('class')).toContain('[fill:var(--chart-fill)]!')

		// The mark's fill var points at a tile that exists in the defs.
		const fill = barMark.style.getPropertyValue('--chart-fill')

		expect(fill).toMatch(/^url\(#chart-tx-.+-blue\)$/)

		expect(container.querySelector(`#${fill.slice(5, -1)}`)).not.toBeNull()
	})

	it('mounts the tiles but holds the fill for forced-colors when off', () => {
		const { container } = bar(false)

		// Tiles are always present, so a chart survives High Contrast without opting in.
		expect(bySlot(container, 'chart-patterns')).not.toBeNull()

		const cls = (allBySlot(container, 'chart-bar')[0] as HTMLElement).getAttribute('class') ?? ''

		// The colour fill is not overridden on screen; the tile waits for forced-colors / print.
		expect(cls).toContain('forced-colors:[fill:var(--chart-fill)]!')

		expect(cls).not.toContain(' [fill:var(--chart-fill)]!')
	})

	it('mirrors the tile on the legend swatch, gated like the marks', () => {
		// A square swatch always mounts its overlay tile (for forced-colors), shown
		// on screen only when the prop is on.
		const on = bar(true).container.querySelector('[data-slot="chart-legend"] svg')

		expect(on?.querySelector('pattern')).not.toBeNull()

		expect(on?.getAttribute('class')).not.toContain('hidden')

		const off = bar(false).container.querySelector('[data-slot="chart-legend"] svg')

		expect(off?.querySelector('pattern')).not.toBeNull()

		expect(off?.getAttribute('class')).toContain('hidden')

		expect(off?.getAttribute('class')).toContain('forced-colors:block')
	})

	it('centres the axis-aligned lines in their legend swatches', () => {
		// Four series map to slots blue, orange, violet, green (k.order): the two
		// diagonals, then the vertical- and horizontal-line textures — the slots
		// whose swatches must read as one line down / across the box's centre.
		const { container } = renderUI(
			<BarChart
				aria-label="Four series by quarter"
				data={[
					{ quarter: 'Q1', revenue: 40, cost: 25, margin: 15, profit: 10 },
					{ quarter: 'Q2', revenue: 80, cost: 30, margin: 50, profit: 20 },
				]}
				series={[
					{ xKey: 'quarter', yKey: 'revenue' },
					{ xKey: 'quarter', yKey: 'cost' },
					{ xKey: 'quarter', yKey: 'margin' },
					{ xKey: 'quarter', yKey: 'profit' },
				]}
				width={400}
				texture
			/>,
		)

		const patterns = [...container.querySelectorAll('[data-slot="chart-legend"] pattern')]

		const pathOf = (p: Element) => p.querySelector('path')?.getAttribute('d')

		// The tile draws each axis-aligned line down its own centre (TILE/2 = 4)...
		const vertical = patterns.find((p) => pathOf(p) === 'M4,0 V8')

		const horizontal = patterns.find((p) => pathOf(p) === 'M0,4 H8')

		expect(vertical).toBeTruthy()

		expect(horizontal).toBeTruthy()

		// ...and the swatch shifts the narrower tile so that centre lands at the
		// box centre (SWATCH_BOX/2 − TILE/2 = 2), not the tile's edge.
		expect(vertical?.getAttribute('patternTransform')).toBe('translate(2 2)')

		expect(horizontal?.getAttribute('patternTransform')).toBe('translate(2 2)')

		// A diagonal slot keeps its rotation and takes no centring shift.
		const diagonal = patterns.find((p) => p.getAttribute('patternTransform') === 'rotate(45)')

		expect(diagonal).toBeTruthy()
	})

	it('textures the pie slices too', () => {
		const { container } = renderUI(
			<PieChart
				aria-label="Revenue share by quarter"
				data={DATA}
				series={[{ xKey: 'quarter', yKey: 'revenue' }]}
				width={400}
				texture
			/>,
		)

		expect(container.querySelectorAll('[data-slot="chart-patterns"] pattern')).toHaveLength(3)

		const slice = allBySlot(container, 'chart-slice')[0] as HTMLElement

		expect(slice.getAttribute('class')).toContain('[fill:var(--chart-fill)]!')

		expect(slice.style.getPropertyValue('--chart-fill')).toMatch(/^url\(#chart-tx-/)
	})
})
