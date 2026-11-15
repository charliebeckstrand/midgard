import { beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import {
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableFoot,
	TableHead,
	TableHeader,
	TableRow,
} from '../../../components/table'
import { Grid, type GridColumn } from '../../../modules/grid'
import { present, renderUI } from '../../helpers'

/**
 * The cell rules of an outlined table, as a real browser lays them out. The
 * rule color is translucent, so a pixel that two rules paint shows a darker or
 * a lighter shade than the rest of the line. Each edge of each cell must
 * therefore lie under exactly one painted rule, and each rule must have the
 * same width and the same color.
 */
beforeAll(() => page.viewport(800, 600))

type Side = 'top' | 'right' | 'bottom' | 'left'

/** A painted border side of a cell, as a rectangle on the page. */
type Rule = {
	axis: 'x' | 'y'
	/** The extent across the line. */
	lo: number
	hi: number
	/** The extent along the line. */
	from: number
	to: number
	width: string
	color: string
}

const width = (style: CSSStyleDeclaration, side: Side) =>
	style.getPropertyValue(`border-${side}-width`)

/** The painted border sides of each cell in `table`. */
function readRules(table: HTMLTableElement): Rule[] {
	const rules: Rule[] = []

	for (const cell of table.querySelectorAll<HTMLElement>(':scope > * > tr > :is(td, th)')) {
		const r = cell.getBoundingClientRect()

		const style = getComputedStyle(cell)

		const add = (side: Side, rule: Omit<Rule, 'width' | 'color'>) => {
			const w = width(style, side)

			if (Number.parseFloat(w) === 0) return

			rules.push({ ...rule, width: w, color: style.getPropertyValue(`border-${side}-color`) })
		}

		const t = Number.parseFloat(width(style, 'top'))
		const rt = Number.parseFloat(width(style, 'right'))
		const b = Number.parseFloat(width(style, 'bottom'))
		const l = Number.parseFloat(width(style, 'left'))

		add('top', { axis: 'y', lo: r.top, hi: r.top + t, from: r.left, to: r.right })
		add('bottom', { axis: 'y', lo: r.bottom - b, hi: r.bottom, from: r.left, to: r.right })
		add('left', { axis: 'x', lo: r.left, hi: r.left + l, from: r.top, to: r.bottom })
		add('right', { axis: 'x', lo: r.right - rt, hi: r.right, from: r.top, to: r.bottom })
	}

	return rules
}

/**
 * The count of painted rules on each edge of each cell. A rule lies on an edge
 * when it crosses the edge line and spans the middle of the edge.
 */
function countRulesOnEdges(table: HTMLTableElement): number[] {
	const rules = readRules(table)

	const counts: number[] = []

	const count = (axis: 'x' | 'y', line: number, middle: number) =>
		rules.filter(
			(rule) =>
				rule.axis === axis &&
				rule.lo < line + 0.5 &&
				rule.hi > line - 0.5 &&
				rule.from <= middle &&
				rule.to >= middle,
		).length

	for (const cell of table.querySelectorAll<HTMLElement>(':scope > * > tr > :is(td, th)')) {
		const r = cell.getBoundingClientRect()

		const midX = (r.left + r.right) / 2
		const midY = (r.top + r.bottom) / 2

		counts.push(
			count('y', r.top, midX),
			count('y', r.bottom, midX),
			count('x', r.left, midY),
			count('x', r.right, midY),
		)
	}

	return counts
}

/** Asserts that each cell edge has one rule, at one width and one color. */
function expectOneRuleEachEdge(table: HTMLTableElement) {
	const counts = countRulesOnEdges(table)

	expect(counts.length).toBeGreaterThan(0)

	expect(new Set(counts)).toEqual(new Set([1]))

	const rules = readRules(table)

	expect(new Set(rules.map((rule) => rule.width))).toEqual(new Set(['1px']))

	expect(new Set(rules.map((rule) => rule.color)).size).toBe(1)
}

const getTable = (container: HTMLElement) =>
	present<HTMLTableElement>(container.querySelector('table'), 'the table')

function Sample({ head = true }: { head?: boolean }) {
	return (
		<>
			<TableCaption>Team</TableCaption>
			{head && (
				<TableHead>
					<TableRow>
						<TableHeader>Name</TableHeader>
						<TableHeader>Role</TableHeader>
						<TableHeader>Team</TableHeader>
					</TableRow>
				</TableHead>
			)}
			<TableBody>
				<TableRow>
					<TableCell>Wade Cooper</TableCell>
					<TableCell>Developer</TableCell>
					<TableCell>Core</TableCell>
				</TableRow>
				<TableRow>
					<TableCell colSpan={2}>Arlene McCoy</TableCell>
					<TableCell>Design</TableCell>
				</TableRow>
			</TableBody>
			<TableFoot>
				<TableRow>
					<TableCell>Total</TableCell>
					<TableCell>2</TableCell>
					<TableCell>2</TableCell>
				</TableRow>
			</TableFoot>
		</>
	)
}

describe('Table outline rules (real browser)', () => {
	it.each([
		['the default weight', true],
		['the subtle weight', 'subtle'],
		['the strong weight', 'strong'],
	] as const)('draws each cell edge once in %s', (_, outline) => {
		const { container } = renderUI(
			<Table outline={outline}>
				<Sample />
			</Table>,
		)

		expectOneRuleEachEdge(getTable(container))
	})

	it('draws the top edge on the first body row of a table with no head', () => {
		const { container } = renderUI(
			<Table outline="strong">
				<Sample head={false} />
			</Table>,
		)

		expectOneRuleEachEdge(getTable(container))
	})

	it('draws each cell edge once in a right-to-left table', () => {
		const { container } = renderUI(
			<div dir="rtl">
				<Table outline="strong">
					<Sample />
				</Table>
			</div>,
		)

		expectOneRuleEachEdge(getTable(container))
	})
})

describe('Grid outline rules (real browser)', () => {
	type Row = { id: number; name: string; role: string }

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', cell: (row) => row.name },
		{ id: 'role', title: 'Role', cell: (row) => row.role },
	]

	const rows: Row[] = [
		{ id: 1, name: 'Wade Cooper', role: 'Developer' },
		{ id: 2, name: 'Arlene McCoy', role: 'Designer' },
	]

	it('draws each cell edge once', () => {
		const { container } = renderUI(
			<Grid outline="strong" columns={columns} rows={rows} getKey={(row) => row.id} />,
		)

		expectOneRuleEachEdge(getTable(container))
	})
})
