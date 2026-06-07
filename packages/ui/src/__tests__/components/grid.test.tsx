import { describe, expect, it } from 'vitest'
import { Grid, GridCell } from '../../components/grid'
import { bySlot, renderUI } from '../helpers'

describe('Grid', () => {
	it('passes through HTML attributes', () => {
		const { container } = renderUI(<Grid id="test">content</Grid>)

		const el = bySlot(container, 'grid')

		expect(el).toHaveAttribute('id', 'test')
	})

	it('applies a numeric columns value via the --cols CSS variable', () => {
		const { container } = renderUI(<Grid columns={3}>content</Grid>)

		const el = bySlot(container, 'grid')

		expect(el?.className).toContain('grid-cols-[repeat(var(--cols),minmax(0,1fr))]')

		expect(el?.style.getPropertyValue('--cols')).toBe('3')
	})

	it('applies a numeric rows value via the --rows CSS variable', () => {
		const { container } = renderUI(<Grid rows={4}>content</Grid>)

		const el = bySlot(container, 'grid')

		expect(el?.className).toContain('grid-rows-[repeat(var(--rows),minmax(0,1fr))]')

		expect(el?.style.getPropertyValue('--rows')).toBe('4')
	})

	it('emits both initial and sm classes for a responsive columns prop', () => {
		const { container } = renderUI(<Grid columns={{ initial: 2, md: 4 }}>content</Grid>)

		const el = bySlot(container, 'grid')

		expect(el?.className).toContain('grid-cols-[repeat(var(--cols),minmax(0,1fr))]')

		expect(el?.className).toContain('md:grid-cols-[repeat(var(--cols-md),minmax(0,1fr))]')

		expect(el?.style.getPropertyValue('--cols')).toBe('2')

		expect(el?.style.getPropertyValue('--cols-md')).toBe('4')
	})

	it('applies flow, align, and justify classes', () => {
		const { container } = renderUI(
			<Grid flow="column" align="center" justify="end">
				content
			</Grid>,
		)

		const cls = bySlot(container, 'grid')?.className ?? ''

		expect(cls).toContain('grid-flow-col')

		expect(cls).toContain('items-center')

		expect(cls).toContain('justify-items-end')
	})

	it('merges inline style with computed grid styles', () => {
		const { container } = renderUI(
			<Grid columns={2} style={{ background: 'red' }}>
				content
			</Grid>,
		)

		const el = bySlot(container, 'grid')

		expect(el?.style.background).toBe('red')

		expect(el?.style.getPropertyValue('--cols')).toBe('2')
	})
})

describe('GridCell', () => {
	it('routes a numeric span through the --span CSS variable', () => {
		const { container } = renderUI(
			<Grid>
				<GridCell span={3}>cell</GridCell>
			</Grid>,
		)

		const cell = bySlot(container, 'grid-cell')

		expect(cell?.className).toContain('col-span-(--span)')
		expect(cell?.style.getPropertyValue('--span')).toBe('3')
	})

	it('emits col-span-full for span="full" when Grid has no columns', () => {
		const { container } = renderUI(
			<Grid>
				<GridCell span="full">cell</GridCell>
			</Grid>,
		)

		expect(bySlot(container, 'grid-cell')?.className).toContain('col-span-full')
	})

	it('mirrors the parent column count for span="full" when Grid columns is provided', () => {
		const { container } = renderUI(
			<Grid columns={4}>
				<GridCell span="full">cell</GridCell>
			</Grid>,
		)

		const cell = bySlot(container, 'grid-cell')

		expect(cell?.className).toContain('col-span-(--span)')
		expect(cell?.style.getPropertyValue('--span')).toBe('4')
	})

	it('routes rowSpan, start, and rowStart through CSS variables', () => {
		const { container } = renderUI(
			<Grid>
				<GridCell rowSpan={2} start={2} rowStart={3}>
					cell
				</GridCell>
			</Grid>,
		)

		const cell = bySlot(container, 'grid-cell')
		const cls = cell?.className ?? ''

		expect(cls).toContain('row-span-(--row-span)')
		expect(cls).toContain('col-start-(--col-start)')
		expect(cls).toContain('row-start-(--row-start)')

		expect(cell?.style.getPropertyValue('--row-span')).toBe('2')
		expect(cell?.style.getPropertyValue('--col-start')).toBe('2')
		expect(cell?.style.getPropertyValue('--row-start')).toBe('3')
	})

	it('sets gridArea inline when area is provided', () => {
		const { container } = renderUI(
			<Grid>
				<GridCell area="header">cell</GridCell>
			</Grid>,
		)

		expect(bySlot(container, 'grid-cell')?.style.gridArea).toBe('header')
	})

	it('passes through HTML attributes', () => {
		const { container } = renderUI(
			<Grid>
				<GridCell id="cell-1">cell</GridCell>
			</Grid>,
		)

		expect(bySlot(container, 'grid-cell')).toHaveAttribute('id', 'cell-1')
	})

	it('mixes numeric and "full" values in a responsive span object', () => {
		const { container } = renderUI(
			<Grid>
				<GridCell span={{ initial: 2, md: 'full' }}>cell</GridCell>
			</Grid>,
		)

		const cell = bySlot(container, 'grid-cell')

		expect(cell?.className).toContain('col-span-(--span)')

		expect(cell?.className).toContain('md:col-span-full')

		expect(cell?.style.getPropertyValue('--span')).toBe('2')
	})
})
