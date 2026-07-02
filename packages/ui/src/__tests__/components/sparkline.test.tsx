import { describe, expect, it } from 'vitest'
import { Sparkline, SparklineSkeleton } from '../../components/sparkline'
import { sparklineGeometry } from '../../components/sparkline/sparkline-geometry'
import { Grid, type GridColumn } from '../../modules/grid'
import { DensityProvider } from '../../providers/density'
import { bySlot, renderUI, screen } from '../helpers'

/** The SVG width a sparkline draws at, keyed to its resolved density step. */
const WIDTH_SM = '64'

const WIDTH_MD = '96'

describe('Sparkline', () => {
	it('renders a role="img" wrapper carrying the accessible name over a hidden SVG', () => {
		const { container } = renderUI(<Sparkline data={[1, 4, 2, 8, 5]} aria-label="Revenue trend" />)

		const el = bySlot(container, 'sparkline')

		expect(el).toHaveAttribute('role', 'img')

		expect(el).toHaveAttribute('aria-label', 'Revenue trend')

		// The decorative SVG is hidden so AT reads one summarized image.
		expect(el?.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
	})

	it('draws the line variant as a path and no bars', () => {
		const { container } = renderUI(<Sparkline data={[1, 4, 2, 8, 5]} aria-label="Trend" />)

		expect(container.querySelector('path')).toBeInTheDocument()

		expect(container.querySelector('rect')).toBeNull()
	})

	it('draws one bar rect per datum in the bar variant', () => {
		const { container } = renderUI(
			<Sparkline data={[1, 4, 2, 8]} variant="bar" aria-label="By period" />,
		)

		expect(container.querySelectorAll('rect')).toHaveLength(4)

		expect(container.querySelector('path')).toBeNull()
	})

	it('adds an area path and an end-point circle only when asked', () => {
		const bare = renderUI(<Sparkline data={[1, 4, 2, 8, 5]} aria-label="Trend" />)

		expect(bare.container.querySelectorAll('path')).toHaveLength(1)

		expect(bare.container.querySelector('circle')).toBeNull()

		const rich = renderUI(<Sparkline data={[1, 4, 2, 8, 5]} fill endPoint aria-label="Trend" />)

		// Area path + line path.
		expect(rich.container.querySelectorAll('path')).toHaveLength(2)

		expect(rich.container.querySelector('circle')).toBeInTheDocument()
	})

	it('still renders the marks under animate for both variants', () => {
		const line = renderUI(
			<Sparkline data={[1, 4, 2, 8, 5]} animate fill endPoint aria-label="Animated line" />,
		)

		expect(bySlot(line.container, 'sparkline')).toHaveAttribute('role', 'img')

		// Area path + line path draw, and the end-point circle mounts.
		expect(line.container.querySelectorAll('path')).toHaveLength(2)

		expect(line.container.querySelector('circle')).toBeInTheDocument()

		const bar = renderUI(
			<Sparkline data={[1, 4, 2, 8]} animate variant="bar" aria-label="Animated bars" />,
		)

		expect(bar.container.querySelectorAll('rect')).toHaveLength(4)
	})

	it('renders an empty box for an empty series without throwing', () => {
		const { container } = renderUI(<Sparkline data={[]} aria-label="No data" />)

		expect(bySlot(container, 'sparkline')).toBeInTheDocument()

		expect(container.querySelector('path')).toBeNull()

		expect(container.querySelector('rect')).toBeNull()
	})

	it('honours aria-labelledby instead of aria-label', () => {
		const { container } = renderUI(
			<>
				<span id="lbl">Latency</span>
				<Sparkline data={[1, 2, 3]} aria-labelledby="lbl" />
			</>,
		)

		expect(bySlot(container, 'sparkline')).toHaveAttribute('aria-labelledby', 'lbl')
	})

	it('pairs with an explicit SparklineSkeleton in loading trees', () => {
		const { container } = renderUI(<SparklineSkeleton />)

		expect(bySlot(container, 'sparkline')).not.toBeInTheDocument()

		expect(bySlot(container, 'placeholder')).toBeInTheDocument()
	})
})

describe('sparklineGeometry', () => {
	const box = { width: 100, height: 40, padding: 2, barGap: 1 }

	it('spreads points across the inner width and inverts value to y', () => {
		const geo = sparklineGeometry([0, 10], { ...box })

		// First point at the left inset, last at the right inset.
		expect(geo.points[0]?.x).toBe(2)

		expect(geo.points[1]?.x).toBe(98)

		// Lower value sits at the baseline, higher at the top inset.
		expect(geo.points[0]?.y).toBeGreaterThan(geo.points[1]?.y ?? 0)

		expect(geo.line.startsWith('M')).toBe(true)

		expect(geo.line).toContain('L')
	})

	it('maps a flat series to the vertical middle rather than dividing by zero', () => {
		const geo = sparklineGeometry([5, 5, 5], { ...box })

		for (const point of geo.points) expect(point.y).toBe(20)
	})

	it('draws a single point as a flat line across the box', () => {
		const geo = sparklineGeometry([7], { ...box })

		expect(geo.points).toHaveLength(1)

		expect(geo.line).toBe('M 2 20 L 98 20')
	})

	it('emits a bar per datum, floored so the minimum still shows', () => {
		const geo = sparklineGeometry([0, 10], { ...box, minBarHeight: 1 })

		expect(geo.bars).toHaveLength(2)

		// The min-value bar keeps a 1-unit sliver instead of vanishing.
		expect(geo.bars[0]?.height).toBe(1)

		expect(geo.bars[1]?.height).toBeGreaterThan(1)
	})

	it('ignores non-finite entries when deriving the domain', () => {
		const geo = sparklineGeometry([1, Number.NaN, 3], { ...box })

		// A stray NaN doesn't collapse the scale: the finite endpoints still separate.
		expect(geo.points[0]?.y).not.toBe(geo.points[2]?.y)
	})

	it('returns empty marks for an empty series', () => {
		const geo = sparklineGeometry([], { ...box })

		expect(geo.line).toBe('')

		expect(geo.bars).toHaveLength(0)

		expect(geo.last).toBeNull()
	})
})

describe('Sparkline in a Grid cell', () => {
	it('renders a sparkline per row', () => {
		const rows = [
			{ id: 1, trend: [1, 2, 3] },
			{ id: 2, trend: [3, 2, 1] },
		]

		renderUI(
			<table>
				<tbody>
					{rows.map((row) => (
						<tr key={row.id}>
							<td>
								<Sparkline data={row.trend} aria-label={`Row ${row.id}`} />
							</td>
						</tr>
					))}
				</tbody>
			</table>,
		)

		expect(screen.getAllByRole('img')).toHaveLength(2)
	})
})

describe('Sparkline density', () => {
	it('resolves its size from the ambient Density when none is given', () => {
		const compact = renderUI(
			<DensityProvider density="compact">
				<Sparkline data={[1, 2, 3]} aria-label="Compact" />
			</DensityProvider>,
		)

		expect(bySlot(compact.container, 'sparkline')?.querySelector('svg')).toHaveAttribute(
			'width',
			WIDTH_SM,
		)
	})

	it('lets an explicit size override the ambient Density', () => {
		const { container } = renderUI(
			<DensityProvider density="compact">
				<Sparkline data={[1, 2, 3]} size="md" aria-label="Pinned" />
			</DensityProvider>,
		)

		expect(bySlot(container, 'sparkline')?.querySelector('svg')).toHaveAttribute('width', WIDTH_MD)
	})

	it('scales to a density-aware Grid, so a cell sparkline tracks the grid', () => {
		const columns: GridColumn<{ id: number; trend: number[] }>[] = [
			{
				id: 'trend',
				title: 'Trend',
				cell: (row) => <Sparkline data={row.trend} aria-label="Cell" />,
			},
		]

		const { container } = renderUI(
			<Grid
				density="compact"
				columns={columns}
				rows={[{ id: 1, trend: [1, 4, 2, 8] }]}
				getKey={(row) => row.id}
			/>,
		)

		// The grid broadcasts its `compact` density onto the cell subtree, so the
		// sparkline draws at the `sm` width without an explicit `size`.
		expect(bySlot(container, 'sparkline')?.querySelector('svg')).toHaveAttribute('width', WIDTH_SM)
	})
})
