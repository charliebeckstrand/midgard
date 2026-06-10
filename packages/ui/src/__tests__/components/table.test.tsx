import { describe, expect, it } from 'vitest'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '../../components/table'
import { Density } from '../../primitives/density'
import { DensityProvider } from '../../providers/density'
import { bySlot, renderUI, screen } from '../helpers'

describe('Table', () => {
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
})

describe('TableHead', () => {
	it('renders a thead element with data-slot="table-head"', () => {
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

		const head = bySlot(container, 'table-head')

		expect(head).toBeInTheDocument()

		expect(head?.tagName).toBe('THEAD')
	})
})

describe('TableHeader', () => {
	it('renders with data-slot="table-header"', () => {
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

		const header = bySlot(container, 'table-header')

		expect(header).toBeInTheDocument()

		expect(header?.tagName).toBe('TH')

		expect(header).toHaveAttribute('scope', 'col')

		expect(screen.getByText('Name')).toBeInTheDocument()
	})
})

describe('TableBody', () => {
	it('renders with data-slot="table-body"', () => {
		const { container } = renderUI(
			<Table>
				<TableBody>
					<TableRow>
						<TableCell>cell</TableCell>
					</TableRow>
				</TableBody>
			</Table>,
		)

		const body = bySlot(container, 'table-body')

		expect(body).toBeInTheDocument()

		expect(body?.tagName).toBe('TBODY')
	})

	it('inherits striped classes from the enclosing Table when striped is set', () => {
		const { container: striped } = renderUI(
			<Table striped>
				<TableBody>
					<TableRow>
						<TableCell>cell</TableCell>
					</TableRow>
				</TableBody>
			</Table>,
		)

		const { container: plain } = renderUI(
			<Table>
				<TableBody>
					<TableRow>
						<TableCell>cell</TableCell>
					</TableRow>
				</TableBody>
			</Table>,
		)

		const stripedClass = bySlot(striped, 'table-body')?.className ?? ''

		const plainClass = bySlot(plain, 'table-body')?.className ?? ''

		expect(stripedClass.length).toBeGreaterThan(plainClass.length)
	})

	it('applies a custom className on TableBody', () => {
		const { container } = renderUI(
			<Table>
				<TableBody className="my-body">
					<TableRow>
						<TableCell>cell</TableCell>
					</TableRow>
				</TableBody>
			</Table>,
		)

		expect(bySlot(container, 'table-body')?.className).toContain('my-body')
	})
})

describe('Table variants', () => {
	it('applies bleed offset classes when bleed is set', () => {
		const { container } = renderUI(
			<Table bleed>
				<TableBody>
					<TableRow>
						<TableCell>cell</TableCell>
					</TableRow>
				</TableBody>
			</Table>,
		)

		const wrapper = bySlot(container, 'table')

		expect(wrapper?.className).toContain('-mx-4')
	})

	it('forwards a ref via tableProps onto the underlying <table>', () => {
		let tableEl: HTMLTableElement | null = null

		renderUI(
			<Table
				tableProps={{
					ref: (el) => {
						tableEl = el
					},
				}}
			>
				<TableBody>
					<TableRow>
						<TableCell>cell</TableCell>
					</TableRow>
				</TableBody>
			</Table>,
		)

		expect(tableEl).toBeInstanceOf(HTMLTableElement)
	})

	it('merges tableProps.className with the variant className', () => {
		const { container } = renderUI(
			<Table tableProps={{ className: 'extra-table' }}>
				<TableBody>
					<TableRow>
						<TableCell>cell</TableCell>
					</TableRow>
				</TableBody>
			</Table>,
		)

		expect(container.querySelector('table')?.className).toContain('extra-table')
	})

	it('renders grid borders when grid is set', () => {
		const { container: gridded } = renderUI(
			<Table grid>
				<TableBody>
					<TableRow>
						<TableCell>cell</TableCell>
					</TableRow>
				</TableBody>
			</Table>,
		)

		const { container: plain } = renderUI(
			<Table>
				<TableBody>
					<TableRow>
						<TableCell>cell</TableCell>
					</TableRow>
				</TableBody>
			</Table>,
		)

		const griddedClass = gridded.querySelector('tbody td')?.className ?? ''

		const plainClass = plain.querySelector('tbody td')?.className ?? ''

		expect(griddedClass).not.toBe(plainClass)
	})
})

describe('Table density inheritance', () => {
	// Cell padding tracks the density axis: sm px-1, md px-2, lg px-3.
	const body = (
		<TableBody>
			<TableRow>
				<TableCell>cell</TableCell>
			</TableRow>
		</TableBody>
	)

	it('defaults to md cell padding outside any provider', () => {
		const { container } = renderUI(<Table>{body}</Table>)

		expect(container.querySelector('tbody td')?.className).toContain('px-2')
	})

	it('tightens to sm padding under an explicit compact density prop', () => {
		const { container } = renderUI(<Table density="compact">{body}</Table>)

		expect(container.querySelector('tbody td')?.className).toContain('px-1')
	})

	it('inherits a compact DensityProvider', () => {
		const { container } = renderUI(
			<DensityProvider density="compact">
				<Table>{body}</Table>
			</DensityProvider>,
		)

		expect(container.querySelector('tbody td')?.className).toContain('px-1')
	})

	it('tracks the density axis, not size, under a two-axis Density', () => {
		const { container } = renderUI(
			<Density space="lg" size="sm">
				<Table>{body}</Table>
			</Density>,
		)

		// density=lg drives padding even though size=sm.
		expect(container.querySelector('tbody td')?.className).toContain('px-3')
	})
})

describe('TableRow', () => {
	it('renders a tr element with data-slot="table-row"', () => {
		const { container } = renderUI(
			<Table>
				<TableBody>
					<TableRow>
						<TableCell>cell</TableCell>
					</TableRow>
				</TableBody>
			</Table>,
		)

		const row = bySlot(container, 'table-row')

		expect(row).toBeInTheDocument()

		expect(row?.tagName).toBe('TR')
	})
})

describe('TableCell', () => {
	it('renders a td element with data-slot="table-cell"', () => {
		const { container } = renderUI(
			<Table>
				<TableBody>
					<TableRow>
						<TableCell>cell</TableCell>
					</TableRow>
				</TableBody>
			</Table>,
		)

		const cell = bySlot(container, 'table-cell')

		expect(cell).toBeInTheDocument()

		expect(cell?.tagName).toBe('TD')
	})
})
