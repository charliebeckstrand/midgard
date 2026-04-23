import { describe, expect, it } from 'vitest'
import { Grid, GridCell, GridDivider } from '../../components/grid'
import { bySlot, renderUI, screen } from '../helpers'

describe('Grid', () => {
	it('renders with data-slot="grid"', () => {
		const { container } = renderUI(<Grid>content</Grid>)

		const el = bySlot(container, 'grid')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('DIV')
	})

	it('renders children', () => {
		renderUI(<Grid>Hello</Grid>)

		expect(screen.getByText('Hello')).toBeInTheDocument()
	})

	it('applies custom className', () => {
		const { container } = renderUI(<Grid className="custom">content</Grid>)

		const el = bySlot(container, 'grid')

		expect(el?.className).toContain('custom')
	})

	it('passes through HTML attributes', () => {
		const { container } = renderUI(<Grid id="test">content</Grid>)

		const el = bySlot(container, 'grid')

		expect(el).toHaveAttribute('id', 'test')
	})
})

describe('GridCell', () => {
	it('renders with data-slot="grid-cell"', () => {
		const { container } = renderUI(
			<Grid>
				<GridCell>cell</GridCell>
			</Grid>,
		)

		expect(bySlot(container, 'grid-cell')).toBeInTheDocument()
	})

	it('applies custom className', () => {
		const { container } = renderUI(
			<Grid>
				<GridCell className="custom">cell</GridCell>
			</Grid>,
		)

		const el = bySlot(container, 'grid-cell')

		expect(el?.className).toContain('custom')
	})

	it('emits col-span-<n> for numeric span', () => {
		const { container } = renderUI(
			<Grid>
				<GridCell span={3}>cell</GridCell>
			</Grid>,
		)

		expect(bySlot(container, 'grid-cell')?.className).toContain('col-span-3')
	})

	it('emits col-span-full for span="full" when Grid has no columns', () => {
		const { container } = renderUI(
			<Grid>
				<GridCell span="full">cell</GridCell>
			</Grid>,
		)

		expect(bySlot(container, 'grid-cell')?.className).toContain('col-span-full')
	})

	it('emits col-span-<columns> for span="full" when Grid columns is provided', () => {
		const { container } = renderUI(
			<Grid columns={4}>
				<GridCell span="full">cell</GridCell>
			</Grid>,
		)

		expect(bySlot(container, 'grid-cell')?.className).toContain('col-span-4')
	})

	it('emits row-span, col-start, and row-start classes', () => {
		const { container } = renderUI(
			<Grid>
				<GridCell rowSpan={2} start={2} rowStart={3}>
					cell
				</GridCell>
			</Grid>,
		)

		const cn = bySlot(container, 'grid-cell')?.className ?? ''

		expect(cn).toContain('row-span-2')
		expect(cn).toContain('col-start-2')
		expect(cn).toContain('row-start-3')
	})

	it('emits a grid-area class when area is provided', () => {
		const { container } = renderUI(
			<Grid>
				<GridCell area="header">cell</GridCell>
			</Grid>,
		)

		expect(bySlot(container, 'grid-cell')?.className).toContain('[grid-area:header]')
	})

	it('passes through HTML attributes', () => {
		const { container } = renderUI(
			<Grid>
				<GridCell id="cell-1">cell</GridCell>
			</Grid>,
		)

		expect(bySlot(container, 'grid-cell')).toHaveAttribute('id', 'cell-1')
	})
})

describe('GridDivider', () => {
	it('renders with data-slot="grid-divider"', () => {
		const { container } = renderUI(
			<Grid>
				<GridDivider />
			</Grid>,
		)

		expect(bySlot(container, 'grid-divider')).toBeInTheDocument()
	})

	it('applies custom className', () => {
		const { container } = renderUI(
			<Grid>
				<GridDivider className="custom" />
			</Grid>,
		)

		const el = bySlot(container, 'grid-divider')

		expect(el?.className).toContain('custom')
	})
})
