import { describe, expect, it } from 'vitest'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '../../components/table'
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

	it('stripes through the Table projection, not the tbody', () => {
		const { container } = renderUI(
			<Table striped>
				<TableBody>
					<TableRow>
						<TableCell>cell</TableCell>
					</TableRow>
				</TableBody>
			</Table>,
		)

		// The table element carries the stripe selector; the static tbody
		// stays bare.
		expect(container.querySelector('table')?.className).toContain(
			'[&>tbody>tr:nth-child(even)]:bg-zinc-950/2.5',
		)

		expect(bySlot(container, 'table-body')?.className).not.toContain('even:')
	})

	it('shades odd rows when striped is "odd"', () => {
		const { container } = renderUI(
			<Table striped="odd">
				<TableBody>
					<TableRow>
						<TableCell>cell</TableCell>
					</TableRow>
				</TableBody>
			</Table>,
		)

		const table = container.querySelector('table')

		expect(table?.className).toContain('[&>tbody>tr:nth-child(odd)]:bg-zinc-950/2.5')

		expect(table?.className).not.toContain('nth-child(even)')
	})

	it('shades even rows when striped is "even", matching the boolean default', () => {
		const { container } = renderUI(
			<Table striped="even">
				<TableBody>
					<TableRow>
						<TableCell>cell</TableCell>
					</TableRow>
				</TableBody>
			</Table>,
		)

		const table = container.querySelector('table')

		expect(table?.className).toContain('[&>tbody>tr:nth-child(even)]:bg-zinc-950/2.5')

		expect(table?.className).not.toContain('nth-child(odd)')
	})

	it('washes body rows on hover through the Table projection, not the tbody', () => {
		const { container } = renderUI(
			<Table hover>
				<TableBody>
					<TableRow>
						<TableCell>cell</TableCell>
					</TableRow>
				</TableBody>
			</Table>,
		)

		// The hover selector rides the table element; the static tbody stays bare.
		expect(container.querySelector('table')?.className).toContain(
			'[&>tbody>tr]:hover:bg-zinc-950/5',
		)

		expect(bySlot(container, 'table-body')?.className).not.toContain('hover:')
	})

	it('omits the hover projection when hover is unset', () => {
		const { container } = renderUI(
			<Table>
				<TableBody>
					<TableRow>
						<TableCell>cell</TableCell>
					</TableRow>
				</TableBody>
			</Table>,
		)

		expect(container.querySelector('table')?.className).not.toContain('hover:bg-zinc-950/5')
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

	it('renders outline borders through the Table projection when outline is set', () => {
		const { container: outlined } = renderUI(
			<Table outline>
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

		// The projection lives on the table element; cells stay identical.
		expect(outlined.querySelector('table')?.className).toContain('[&>*>tr>td]:border')

		expect(outlined.querySelector('tbody td')?.className).toBe(
			plain.querySelector('tbody td')?.className,
		)
	})
})

describe('Table density resolution', () => {
	// Cell padding tracks the density prop: compact px-1, snug px-2, loose px-3.
	const body = (
		<TableBody>
			<TableRow>
				<TableCell>cell</TableCell>
			</TableRow>
		</TableBody>
	)

	it('defaults to snug: md cell padding and no density projection', () => {
		const { container } = renderUI(<Table>{body}</Table>)

		expect(container.querySelector('tbody td')?.className).toContain('px-2')

		expect(container.querySelector('table')?.className).not.toContain('[&>*>tr>td]:px-')
	})

	it('projects sm padding under an explicit compact density prop', () => {
		const { container } = renderUI(<Table density="compact">{body}</Table>)

		// The static cell keeps its md classes; the table element overrides
		// them from outside.
		expect(container.querySelector('table')?.className).toContain('[&>*>tr>td]:px-1')

		expect(container.querySelector('table')).toHaveAttribute('data-density', 'sm')

		expect(container.querySelector('tbody td')?.className).toContain('px-2')
	})

	it('ignores an ambient DensityProvider', () => {
		const { container } = renderUI(
			<DensityProvider density="compact">
				<Table>{body}</Table>
			</DensityProvider>,
		)

		// Static leaf: density comes from the explicit prop only.
		expect(container.querySelector('table')?.className).not.toContain('[&>*>tr>td]:px-')

		expect(container.querySelector('table')).toHaveAttribute('data-density', 'md')
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
