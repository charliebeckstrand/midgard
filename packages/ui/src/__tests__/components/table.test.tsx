import { describe, expect, it } from 'vitest'
import {
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableEmpty,
	TableFoot,
	TableHead,
	TableHeader,
	TableLoading,
	TableRow,
} from '../../components/table'
import { DensityProvider } from '../../providers/density'
import { LocaleProvider } from '../../providers/locale'
import { bySlot, renderUI, screen } from '../helpers'

/** The body of one row with one cell, for the cases that need no other content. */
const body = (
	<TableBody>
		<TableRow>
			<TableCell>cell</TableCell>
		</TableRow>
	</TableBody>
)

describe('Table', () => {
	it('names the table from a TableCaption, and groups summary rows in a TableFoot', () => {
		const { container } = renderUI(
			<Table>
				<TableCaption>Loads by lane</TableCaption>
				<TableBody>
					<TableRow>
						<TableCell>1</TableCell>
					</TableRow>
				</TableBody>
				<TableFoot>
					<TableRow>
						<TableCell>Total</TableCell>
					</TableRow>
				</TableFoot>
			</Table>,
		)

		expect(screen.getByRole('table', { name: 'Loads by lane' })).toBeInTheDocument()

		expect(bySlot(container, 'table-caption')?.tagName).toBe('CAPTION')

		expect(bySlot(container, 'table-foot')?.tagName).toBe('TFOOT')
	})
})

describe('Table anatomy', () => {
	it.each([
		['table-head', 'THEAD'],
		['table-body', 'TBODY'],
		['table-row', 'TR'],
		['table-cell', 'TD'],
	])('renders data-slot="%s" as a %s element', (slot, tag) => {
		const { container } = renderUI(
			<Table>
				<TableHead>
					<TableRow>
						<TableHeader>Header</TableHeader>
					</TableRow>
				</TableHead>
				{body}
			</Table>,
		)

		expect(bySlot(container, slot)?.tagName).toBe(tag)
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
				{body}
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
	it('stripes through the Table projection, not the tbody', () => {
		const { container } = renderUI(<Table striped>{body}</Table>)

		// The table element carries the stripe selector; the static tbody
		// stays bare.
		expect(container.querySelector('table')?.className).toContain(
			'[&>tbody>tr:nth-child(even)]:bg-zinc-950/2.5',
		)

		expect(bySlot(container, 'table-body')?.className).not.toContain('even:')
	})

	it.each([
		['odd', 'odd', 'even'],
		['even', 'even', 'odd'],
	] as const)('shades %s rows when striped is "%s"', (_name, striped, other) => {
		const { container } = renderUI(<Table striped={striped}>{body}</Table>)

		const table = container.querySelector('table')

		expect(table?.className).toContain(`[&>tbody>tr:nth-child(${striped})]:bg-zinc-950/2.5`)

		expect(table?.className).not.toContain(`nth-child(${other})`)
	})

	it('washes body rows on hover through the Table projection, not the tbody', () => {
		const { container } = renderUI(<Table hover>{body}</Table>)

		// The hover selector rides the table element; the static tbody stays bare.
		expect(container.querySelector('table')?.className).toContain(
			'[&>tbody>tr]:hover:bg-zinc-950/5',
		)

		expect(bySlot(container, 'table-body')?.className).not.toContain('hover:')
	})

	it('omits the hover projection when hover is unset', () => {
		const { container } = renderUI(<Table>{body}</Table>)

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
		const { container } = renderUI(<Table bleed>{body}</Table>)

		const wrapper = bySlot(container, 'table')

		expect(wrapper?.className).toContain('-mx-4')
	})

	it('forwards a ref via tableProps onto the underlying <table>', () => {
		let table: HTMLTableElement | null = null

		renderUI(
			<Table
				tableProps={{
					ref: (el) => {
						table = el
					},
				}}
			>
				{body}
			</Table>,
		)

		expect(table).toBeInstanceOf(HTMLTableElement)
	})

	it('merges tableProps.className with the variant className', () => {
		const { container } = renderUI(<Table tableProps={{ className: 'extra-table' }}>{body}</Table>)

		expect(container.querySelector('table')?.className).toContain('extra-table')
	})

	it('renders outline borders through the Table projection when outline is set', () => {
		const { container: outlined } = renderUI(<Table outline>{body}</Table>)

		const { container: plain } = renderUI(<Table>{body}</Table>)

		// The projection lives on the table element; cells stay identical.
		expect(outlined.querySelector('table')?.className).toContain('[&>*>tr>:is(td,th)]:border')

		expect(outlined.querySelector('tbody td')?.className).toBe(
			plain.querySelector('tbody td')?.className,
		)
	})

	// The weights are those of the Card outline: `true` is the default weight.
	it.each([
		['the default weight for `true`', true, 'border-zinc-950/10'],
		['the subtle weight', 'subtle', 'border-zinc-950/5'],
		['the strong weight', 'strong', 'border-zinc-950/15'],
	] as const)('projects %s onto the cells', (_, outline, color) => {
		const { container } = renderUI(<Table outline={outline}>{body}</Table>)

		expect(container.querySelector('table')).toHaveClass(`[&>*>tr>:is(td,th)]:${color}`)
	})

	it('draws no cell borders when outline is false', () => {
		const { container } = renderUI(<Table outline={false}>{body}</Table>)

		expect(container.querySelector('table')?.className).not.toContain('[&>*>tr>:is(td,th)]:border')
	})
})

describe('Table density resolution', () => {
	// Cell padding is a stepped class: sm px-1, md px-2, lg px-3.
	// jsdom loads no stylesheet, so these cases check the scope and the classes.
	// density-scope.test.tsx checks the computed padding in a real browser.
	it('carries each padding step on the cell', () => {
		const { container } = renderUI(<Table>{body}</Table>)

		expect(container.querySelector('tbody td')).toHaveClass(
			'density-px-[0.5,1,2,3,4.5]',
			'density-py-[0.5,1,2,3,4.5]',
		)
	})

	it('opens no scope without a size, so the cells follow the scope around it', () => {
		const { container } = renderUI(
			<DensityProvider density="compact">
				<Table>{body}</Table>
			</DensityProvider>,
		)

		expect(container.querySelector('[data-slot="table"]')).not.toHaveAttribute('data-density')
	})

	it('opens a scope at an explicit size', () => {
		const { container } = renderUI(<Table size="sm">{body}</Table>)

		expect(container.querySelector('[data-slot="table"]')).toHaveAttribute('data-density', 'sm')
	})
})

describe('TableLoading', () => {
	it('marks its body busy, so the hidden skeleton cells do not read as an empty table', () => {
		const { container } = renderUI(
			<Table>
				<TableLoading columns={2} />
			</Table>,
		)

		expect(bySlot(container, 'table-body')).toHaveAttribute('aria-busy', 'true')
	})
})

describe('TableEmpty', () => {
	it('shows the default empty message in the language of the locale', () => {
		const { rerender } = renderUI(
			<Table>
				<TableEmpty columns={2} />
			</Table>,
		)

		expect(screen.getByText('No items')).toBeInTheDocument()

		rerender(
			<LocaleProvider locale="es">
				<Table>
					<TableEmpty columns={2} />
				</Table>
			</LocaleProvider>,
		)

		expect(screen.getByText('Sin elementos')).toBeInTheDocument()
	})

	it('shows its own content in place of the default message', () => {
		renderUI(
			<Table>
				<TableEmpty columns={2}>Nothing yet</TableEmpty>
			</Table>,
		)

		expect(screen.getByText('Nothing yet')).toBeInTheDocument()

		expect(screen.queryByText('No items')).not.toBeInTheDocument()
	})
})
