import { beforeAll, describe, expect, it } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { BarChart } from '../../modules/chart/bar-chart'
import { HeatmapChart } from '../../modules/chart/heatmap-chart'
import { LineChart } from '../../modules/chart/line-chart'
import { ScatterChart } from '../../modules/chart/scatter-chart'
import { allBySlot, bySlot, renderUI, waitFor } from '../helpers'

/**
 * A sparkline is non-interactive. At the spark tier a chart draws bare marks and
 * mounts none of the pointer chrome: no hit layer over the plot, and so no
 * crosshair or tooltip — both driven by the hover the hit layer feeds — and the
 * keyboard is already off at spark. Scatter, bubble, and the heatmap also shed
 * the x/y value labels the wider tiers carry, which the cartesian charts already
 * dropped through their axis gate. The frame owns all of it: it renders the
 * drawing pointer-inert — no mark hover styling or reference-rule pointer can
 * engage — and publishes the tier so the interactive layers stand themselves
 * down. Hit testing and hover engagement are computed-layout facts — the tier
 * resolves from the measured box — so this rides the real browser the way the
 * tier anatomy does.
 */
describe('spark tier is non-interactive (real browser)', () => {
	beforeAll(() => page.viewport(1200, 800))

	const MONTHS = [
		{ month: 'January', revenue: 42_000 },
		{ month: 'February', revenue: 58_000 },
		{ month: 'March', revenue: 47_000 },
		{ month: 'April', revenue: 63_000 },
	]

	const POINTS = [
		{ x: 1, y: 2 },
		{ x: 2, y: 5 },
		{ x: 3, y: 3 },
		{ x: 4, y: 7 },
	]

	// Two columns × two rows, so the pivot has distinct x and y categories to label.
	const GRID = [
		{ hour: '9', day: 'Mon', commits: 3 },
		{ hour: '10', day: 'Mon', commits: 5 },
		{ hour: '9', day: 'Tue', commits: 2 },
		{ hour: '10', day: 'Tue', commits: 8 },
	]

	const bar = (width: number, height: number) => (
		<BarChart
			aria-label="Revenue by month"
			data={MONTHS}
			series={[{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' }]}
			crosshair
			width={width}
			height={height}
		/>
	)

	const scatter = (width: number, height: number) => (
		<ScatterChart
			aria-label="Y against X"
			data={POINTS}
			series={[{ xKey: 'x', yKey: 'y', yName: 'Y' }]}
			crosshair
			width={width}
			height={height}
		/>
	)

	const heatmap = (width: number, height: number) => (
		<HeatmapChart
			aria-label="Commits by day and hour"
			data={GRID}
			series={[
				{ xKey: 'hour', yKey: 'day', colorKey: 'commits', colorRange: ['#eef', '#88f', '#00a'] },
			]}
			width={width}
			height={height}
		/>
	)

	it('a spark bar drops the crosshair hit layer while keeping its marks', () => {
		const { container } = renderUI(bar(140, 100))

		expect(allBySlot(container, 'chart-bar').length).toBeGreaterThan(0)

		// No hit layer, so the pointer feeds no hover — the crosshair and tooltip that
		// ride it can never draw.
		expect(bySlot(container, 'chart-hit')).toBeNull()

		expect(bySlot(container, 'chart-crosshair-x')).toBeNull()

		expect(bySlot(container, 'chart-crosshair-y')).toBeNull()
	})

	it('a wider bar keeps the crosshair hit layer', () => {
		const { container } = renderUI(bar(520, 320))

		expect(bySlot(container, 'chart-hit')).not.toBeNull()
	})

	it('a spark scatter drops its value labels and hit layer, keeping the points', () => {
		const { container } = renderUI(scatter(140, 100))

		expect(allBySlot(container, 'chart-scatter-point').length).toBeGreaterThan(0)

		expect(bySlot(container, 'chart-axis-x')).toBeNull()

		expect(bySlot(container, 'chart-axis-y')).toBeNull()

		expect(bySlot(container, 'chart-grid-lines')).toBeNull()

		expect(bySlot(container, 'chart-hit')).toBeNull()
	})

	it('a wider scatter carries both axes and its hit layer', () => {
		const { container } = renderUI(scatter(520, 360))

		expect(bySlot(container, 'chart-axis-x')).not.toBeNull()

		expect(bySlot(container, 'chart-axis-y')).not.toBeNull()

		expect(bySlot(container, 'chart-hit')).not.toBeNull()
	})

	it('a spark heatmap drops its row and column labels and hover layer, keeping the cells', () => {
		const { container } = renderUI(heatmap(140, 100))

		expect(bySlot(container, 'heatmap-cells')).not.toBeNull()

		expect(bySlot(container, 'chart-axis-x')).toBeNull()

		expect(bySlot(container, 'chart-axis-y')).toBeNull()

		expect(bySlot(container, 'heatmap-hit')).toBeNull()
	})

	it('a wider heatmap carries its labels and hover layer', () => {
		const { container } = renderUI(heatmap(420, 300))

		expect(bySlot(container, 'chart-axis-x')).not.toBeNull()

		expect(bySlot(container, 'chart-axis-y')).not.toBeNull()

		expect(bySlot(container, 'heatmap-hit')).not.toBeNull()
	})

	// One category, so the lone bar spans the chart's own center: hovering the
	// chart root parks the pointer on the bar's pixels without aiming. `tooltip`
	// off and no crosshair, so no hit rect covers the marks at either tier — the
	// only difference between the pair is the spark pointer veto.
	const ONE_BAR = [{ month: 'January', revenue: 60_000 }]

	const hoverBar = (width: number, height: number) => (
		<BarChart
			aria-label="Revenue"
			data={ONE_BAR}
			series={[{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' }]}
			tooltip={false}
			width={width}
			height={height}
		/>
	)

	it('a spark bar takes no hover styling — the drawing is pointer-inert', async () => {
		const { container } = renderUI(hoverBar(140, 100))

		const root = bySlot(container, 'chart') as HTMLElement

		const mark = bySlot(container, 'chart-bar') as HTMLElement

		// The bar really sits under the chart's center, where the hover will park.
		const rect = root.getBoundingClientRect()

		const point = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }

		const box = mark.getBoundingClientRect()

		expect(box.left).toBeLessThan(point.x)

		expect(box.right).toBeGreaterThan(point.x)

		expect(box.top).toBeLessThan(point.y)

		expect(box.bottom).toBeGreaterThan(point.y)

		await userEvent.hover(root)

		// The pointer arrived — the root reads :hover — yet the inert mark never
		// does, so its hover lift cannot engage.
		await waitFor(() => expect(root.matches(':hover')).toBe(true))

		expect(mark.matches(':hover')).toBe(false)

		expect(getComputedStyle(mark).filter).toBe('none')
	})

	it('a framed bar keeps its hover lift', async () => {
		const { container } = renderUI(hoverBar(520, 320))

		const mark = bySlot(container, 'chart-bar') as HTMLElement

		await userEvent.hover(mark)

		await waitFor(() => expect(getComputedStyle(mark).filter).toContain('brightness'))
	})

	// A mid-domain rule, so the dashed line crosses the chart's center row where
	// the spark hover parks. The default tooltip keeps the hit rect mounted at the
	// framed tier, proving the rules still win the pointer over it there.
	const referenced = (width: number, height: number) => (
		<BarChart
			aria-label="Revenue"
			data={ONE_BAR}
			series={[{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' }]}
			reference={[{ value: 30_000, label: 'Target' }]}
			width={width}
			height={height}
		/>
	)

	it('a spark reference rule draws bare and takes no pointer events', async () => {
		const { container } = renderUI(referenced(140, 100))

		const rule = bySlot(container, 'chart-reference-line') as HTMLElement

		// The rule still draws — spark strips interactivity, not the ink — but as
		// the bare stroke alone: no transparent hit line widens it into a target.
		expect(rule).not.toBeNull()

		expect(rule.querySelectorAll('line')).toHaveLength(1)

		expect(getComputedStyle(rule).pointerEvents).toBe('none')

		const root = bySlot(container, 'chart') as HTMLElement

		await userEvent.hover(root)

		await waitFor(() => expect(root.matches(':hover')).toBe(true))

		// Pointing where the rule sits recedes no marks — the hover rendering, whose
		// pointer-enter drives that emphasis (and the tooltip), never mounted.
		const marks = bySlot(container, 'chart-marks') as HTMLElement

		expect(marks.classList.contains('opacity-25')).toBe(false)
	})

	it('a framed reference rule keeps its hover target and emphasis', async () => {
		const { container } = renderUI(referenced(520, 320))

		const rule = bySlot(container, 'chart-reference-line') as HTMLElement

		// The hover rendering: the drawn stroke under its wide transparent hit line.
		expect(rule.querySelectorAll('line')).toHaveLength(2)

		// Park the pointer on the rule's row. The hover targets the plot region — an
		// SVG <g> has no client rects, so Playwright would wait on it forever — and
		// the rule's hit line wins the point as its descendant, over the hit rect the
		// default tooltip keeps mounted beneath it. The receded marks prove the rule's
		// pointer-enter fired; the readout it also opens rides the floating engine
		// this suite mocks, so the live-tooltip contract stays with the floating-ui
		// suite's Tooltip cases.
		const region = bySlot(container, 'chart-plot') as HTMLElement

		const regionBox = region.getBoundingClientRect()

		const ruleBox = rule.getBoundingClientRect()

		await userEvent.hover(region, {
			position: {
				x: ruleBox.left - regionBox.left + ruleBox.width / 2,
				y: ruleBox.top - regionBox.top + ruleBox.height / 2,
			},
		})

		await waitFor(() =>
			expect(
				(bySlot(container, 'chart-marks') as HTMLElement).classList.contains('opacity-25'),
			).toBe(true),
		)
	})

	it('spark drops the standing value and reference labels the wider tiers draw', () => {
		const labelled = (width: number, height: number) => (
			<LineChart
				aria-label="Revenue by month"
				data={MONTHS}
				series={[{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' }]}
				reference={[{ value: 50_000, label: 'Target' }]}
				labels={{ endpoints: true, references: true }}
				width={width}
				height={height}
			/>
		)

		const spark = renderUI(labelled(140, 100))

		// The rule's ink survives; every label stands down with the chrome.
		expect(bySlot(spark.container, 'chart-reference-line')).not.toBeNull()

		expect(bySlot(spark.container, 'chart-reference-label')).toBeNull()

		expect(bySlot(spark.container, 'chart-value-labels')).toBeNull()

		const framed = renderUI(labelled(520, 320))

		expect(bySlot(framed.container, 'chart-reference-label')).not.toBeNull()

		expect(bySlot(framed.container, 'chart-value-labels')).not.toBeNull()
	})
})
