import { describe, expect, it } from 'vitest'
import { JsonTree } from '../../components/json-tree'
import { bySlot, fireEvent, renderUI, screen } from '../helpers'

describe('JsonTree', () => {
	it('renders with data-slot="json-tree" and role="tree"', () => {
		const { container } = renderUI(<JsonTree data={{}} />)

		const el = bySlot(container, 'json-tree')

		expect(el).toBeInTheDocument()

		expect(el).toHaveAttribute('role', 'tree')
	})

	it('applies custom className', () => {
		const { container } = renderUI(<JsonTree data={{}} className="custom" />)

		const el = bySlot(container, 'json-tree')

		expect(el?.className).toContain('custom')
	})

	it('renders primitive leaves with their values', () => {
		renderUI(
			<JsonTree data={{ name: 'Ada', age: 42, active: true, meta: null }} defaultExpandDepth={1} />,
		)

		expect(screen.getByText('"Ada"')).toBeInTheDocument()
		expect(screen.getByText('42')).toBeInTheDocument()
		expect(screen.getByText('true')).toBeInTheDocument()
		expect(screen.getByText('null')).toBeInTheDocument()
	})

	it('renders object keys with quotes and array indices without quotes', () => {
		renderUI(<JsonTree data={{ tags: ['a', 'b'] }} defaultExpandDepth={2} />)

		expect(screen.getByText('"tags"')).toBeInTheDocument()

		expect(screen.getByText('0')).toBeInTheDocument()

		expect(screen.getByText('1')).toBeInTheDocument()
	})

	it('toggles a branch open and closed on click', () => {
		renderUI(<JsonTree data={{ nested: { value: 1 } }} defaultExpandDepth={1} />)

		expect(screen.queryByText('"value"')).not.toBeInTheDocument()

		const toggle = screen.getByText('"nested"').closest('button')

		if (!toggle) throw new Error('toggle not found')

		fireEvent.click(toggle)

		expect(screen.getByText('"value"')).toBeInTheDocument()
	})

	it('shows a summary when a branch is closed', () => {
		renderUI(<JsonTree data={{ items: [1, 2, 3] }} defaultExpandDepth={1} />)

		expect(screen.getByText('3 items')).toBeInTheDocument()
	})
})
