import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Sparkline, SparklineSkeleton } from '../../components/sparkline'
import { Grid, type GridColumn } from '../../modules/grid'
import { bySlot, densityStepOf, getSlot, renderUI } from '../helpers'

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
			<Sparkline data={[1, 4, 2, 8]} shape="bar" aria-label="By period" />,
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

	it('ignores endPoint for the bar shape, so the bars keep their inset', () => {
		const data = [1, 4, 2, 8]

		const plain = renderUI(<Sparkline data={data} shape="bar" aria-label="By period" />)

		const marked = renderUI(<Sparkline data={data} shape="bar" endPoint aria-label="By period" />)

		const boxes = (root: HTMLElement) =>
			Array.from(root.querySelectorAll('rect'), (rect) =>
				['x', 'y', 'width', 'height'].map((name) => rect.getAttribute(name)),
			)

		expect(boxes(marked.container)).toEqual(boxes(plain.container))
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
			<Sparkline data={[1, 4, 2, 8]} animate shape="bar" aria-label="Animated bars" />,
		)

		expect(bar.container.querySelectorAll('rect')).toHaveLength(4)
	})

	it('keeps the animated bar rects mounted when the series grows', () => {
		const { container, rerender } = renderUI(
			<Sparkline data={[1, 4, 2, 8]} animate shape="bar" aria-label="Animated bars" />,
		)

		const before = [...container.querySelectorAll('rect')]

		expect(before).toHaveLength(4)

		rerender(<Sparkline data={[1, 4, 2, 8, 5]} animate shape="bar" aria-label="Animated bars" />)

		const after = [...container.querySelectorAll('rect')]

		expect(after).toHaveLength(5)

		// Keyed on x, a longer series would move every key and remount the whole row.
		for (const [index, rect] of before.entries()) expect(after[index]).toBe(rect)
	})

	it('keeps the later bar rects mounted when an earlier datum goes non-finite', () => {
		const { container, rerender } = renderUI(
			<Sparkline data={[1, 4, 2, 8]} animate shape="bar" aria-label="Animated bars" />,
		)

		const before = [...container.querySelectorAll('rect')]

		rerender(
			<Sparkline data={[1, Number.NaN, 2, 8]} animate shape="bar" aria-label="Animated bars" />,
		)

		const after = [...container.querySelectorAll('rect')]

		// The hole drops one bar. The datum index keys the rest, so the two bars
		// after the hole hold their nodes; an array position would slide them.
		expect(after).toHaveLength(3)

		expect(after[0]).toBe(before[0])

		expect(after[1]).toBe(before[2])

		expect(after[2]).toBe(before[3])
	})

	it('renders an empty box for an empty series without throwing', () => {
		const { container } = renderUI(<Sparkline data={[]} aria-label="No data" />)

		expect(bySlot(container, 'sparkline')).toBeInTheDocument()

		expect(container.querySelector('path')).toBeNull()

		expect(container.querySelector('rect')).toBeNull()
	})

	it('honors aria-labelledby instead of aria-label', () => {
		const { container } = renderUI(
			<>
				<span id="lbl">Latency</span>
				<Sparkline data={[1, 2, 3]} aria-labelledby="lbl" />
			</>,
		)

		expect(bySlot(container, 'sparkline')).toHaveAttribute('aria-labelledby', 'lbl')
	})
})

describe('Sparkline density', () => {
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
				size="sm"
				columns={columns}
				rows={[{ id: 1, trend: [1, 4, 2, 8] }]}
				getKey={(row) => row.id}
			/>,
		)

		// The grid writes its `compact` density as a scope on the cells, so the
		// sparkline takes the `sm` step without an explicit `size`.
		const sparkline = getSlot(container, 'sparkline')

		expect(densityStepOf(sparkline)).toBe('sm')

		expect(sparkline.querySelector('svg')?.getAttribute('class')).toContain(
			'density-w-[12,18,24,30,36]',
		)
	})

	it('draws one 3:1 viewBox at each step and pins the box to an explicit width', () => {
		const { container } = renderUI(
			<>
				<Sparkline data={[1, 2]} aria-label="Stepped" />
				<Sparkline data={[1, 2]} width={120} aria-label="Pinned" />
			</>,
		)

		const [stepped, pinned] = container.querySelectorAll('svg')

		expect(stepped).toHaveAttribute('viewBox', '0 0 96 32')

		expect(stepped).not.toHaveAttribute('width')

		expect(pinned).toHaveAttribute('viewBox', '0 0 120 32')

		expect(pinned).toHaveAttribute('width', '120')
	})

	/*
	 * A sparkline can sit in a line of text, so its skeleton has to be able to as well. Parsed back
	 * from server markup, the way a browser meets it: a `div` inside a `<p>` makes the parser
	 * close the paragraph there, and the tree it hydrates no longer matches.
	 */
	it('has a skeleton that stands in inside a paragraph, as server markup and inline', () => {
		const container = document.createElement('div')

		container.innerHTML = renderToString(
			<p>
				Revenue <SparklineSkeleton size="sm" />
			</p>,
		)

		const skeleton = getSlot(container, 'placeholder')

		expect(skeleton.tagName).toBe('SPAN')

		expect(skeleton.parentElement?.tagName).toBe('P')

		expect(skeleton).toHaveClass('inline-block', 'align-middle')

		expect(skeleton).not.toHaveClass('block')
	})
})
