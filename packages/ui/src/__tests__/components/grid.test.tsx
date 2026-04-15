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
