import { describe, expect, it } from 'vitest'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '../../components/table'
import { bySlot, renderUI, screen } from '../helpers'

describe('Table', () => {
	it('renders with data-slot="table"', () => {
		const { container } = renderUI(
			<Table>
				<TableBody>
					<TableRow>
						<TableCell>cell</TableCell>
					</TableRow>
				</TableBody>
			</Table>,
		)

		const el = bySlot(container, 'table')

		expect(el).toBeInTheDocument()
	})

	it('renders a table element inside the wrapper', () => {
		const { container } = renderUI(
			<Table>
				<TableBody>
					<TableRow>
						<TableCell>cell</TableCell>
					</TableRow>
				</TableBody>
			</Table>,
		)

		expect(container.querySelector('table')).toBeInTheDocument()
	})

	it('renders children', () => {
		renderUI(
			<Table>
				<TableBody>
					<TableRow>
						<TableCell>Hello</TableCell>
					</TableRow>
				</TableBody>
			</Table>,
		)

		expect(screen.getByText('Hello')).toBeInTheDocument()
	})

	it('applies custom className to the table element', () => {
		const { container } = renderUI(
			<Table className="custom">
				<TableBody>
					<TableRow>
						<TableCell>cell</TableCell>
					</TableRow>
				</TableBody>
			</Table>,
		)

		const table = container.querySelector('table')

		expect(table?.className).toContain('custom')
	})
})

describe('TableHead', () => {
	it('renders a thead element', () => {
		const { container } = renderUI(
			<Table>
				<TableHead>
					<TableRow>
						<TableHeader>Header</TableHeader>
					</TableRow>
				</TableHead>
				<TableBody>
					<TableRow>
						<TableCell>cell</TableCell>
					</TableRow>
				</TableBody>
			</Table>,
		)

		expect(container.querySelector('thead')).toBeInTheDocument()
	})
})

describe('TableHeader', () => {
	it('renders a th element with scope="col"', () => {
		const { container } = renderUI(
			<Table>
				<TableHead>
					<TableRow>
						<TableHeader>Name</TableHeader>
					</TableRow>
				</TableHead>
				<TableBody>
					<TableRow>
						<TableCell>cell</TableCell>
					</TableRow>
				</TableBody>
			</Table>,
		)

		const th = container.querySelector('th')

		expect(th).toBeInTheDocument()

		expect(th).toHaveAttribute('scope', 'col')

		expect(screen.getByText('Name')).toBeInTheDocument()
	})
})

describe('TableRow', () => {
	it('renders a tr element', () => {
		const { container } = renderUI(
			<Table>
				<TableBody>
					<TableRow>
						<TableCell>cell</TableCell>
					</TableRow>
				</TableBody>
			</Table>,
		)

		expect(container.querySelector('tr')).toBeInTheDocument()
	})
})
