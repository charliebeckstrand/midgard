import { beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { createGroup, QueryBuilder, type QueryField } from '../../../modules/query'
import { renderUI, screen } from '../../helpers'
import { PIXEL } from '../../helpers/geometry/tolerance'

// Twice a field width doubles its rounding, so the range can miss by this much.
const RANGE_WIDTH_SLACK = 2

/**
 * A rule row shares its width among its parts from a zero basis, and a range
 * value takes two shares. The range holds two number inputs, each with its
 * steppers, so one share left each input too narrow for its placeholder. Real
 * layout, so this runs in the browser suite. The parts share a row from `sm`
 * up, so the viewport is wider than that breakpoint.
 */
describe('QueryBuilder rule row widths (real browser)', () => {
	beforeAll(() => page.viewport(1024, 768))

	const fields: QueryField[] = [
		{ name: 'name', label: 'Name', type: 'text' },
		{ name: 'age', label: 'Age', type: 'number', span: [18, 90] },
	]

	const width = (element: Element) => element.getBoundingClientRect().width

	/**
	 * The flex item of the rule row that holds `element`. A `Select` wraps its
	 * frame in a `display: contents` box, which has no width. The frame inside
	 * it is the item that the row sizes.
	 */
	const part = (element: Element) => {
		let node: Element = element

		while (node.parentElement) {
			const parent = node.parentElement

			if (getComputedStyle(parent).display === 'contents') return node

			if (parent.parentElement?.matches('[data-slot="query-rule"]')) return node

			node = parent
		}

		throw new Error('no rule part holds the element')
	}

	it('gives a range value two shares and each other part one', () => {
		renderUI(
			<div style={{ width: 720 }}>
				<QueryBuilder
					fields={fields}
					defaultValue={createGroup('and', [
						{ id: 'r', type: 'rule', field: 'age', operator: 'between', value: ['', ''] },
					])}
				/>
			</div>,
		)

		const field = width(part(screen.getByRole('combobox', { name: 'Field' })))

		const operator = width(part(screen.getByRole('combobox', { name: 'Operator' })))

		const range = width(part(screen.getByRole('spinbutton', { name: 'Age minimum' })))

		expect(field * 4).toBeLessThanOrEqual(720)

		expect(field).toBeNear(operator, PIXEL)

		expect(range).toBeNear(2 * field, RANGE_WIDTH_SLACK)
	})

	it('gives each part of a scalar rule one share', () => {
		renderUI(
			<div style={{ width: 720 }}>
				<QueryBuilder
					fields={fields}
					defaultValue={createGroup('and', [
						{ id: 'r', type: 'rule', field: 'age', operator: 'gt', value: 30 },
					])}
				/>
			</div>,
		)

		const field = width(part(screen.getByRole('combobox', { name: 'Field' })))

		const operator = width(part(screen.getByRole('combobox', { name: 'Operator' })))

		const value = width(part(screen.getByRole('spinbutton', { name: 'Age value' })))

		// The parts share one row, so each is well under the full width.
		expect(field * 3).toBeLessThanOrEqual(720)

		expect(operator).toBeNear(field, PIXEL)

		expect(value).toBeNear(field, PIXEL)
	})

	const statusFields: QueryField[] = [
		{
			name: 'status',
			label: 'Status',
			type: 'select',
			options: [
				{ value: 'active', label: 'Active' },
				{ value: 'archived', label: 'Archived' },
			],
		},
	]

	const statusRule = () =>
		createGroup('and', [
			{ id: 'r', type: 'rule', field: 'status', operator: 'equals', value: 'active' },
		])

	/** True when the select shows its whole text, with no ellipsis. */
	const fits = (combobox: HTMLElement) => {
		const text = [...combobox.querySelectorAll<HTMLElement>('*')].find(
			(el) => el.children.length === 0 && el.textContent?.trim(),
		)

		if (!text) throw new Error('no text in the select')

		return text.scrollWidth <= text.clientWidth
	}

	// In a container that sizes to its content, the equal shares gave each part
	// the mean width of the three texts, which cut the longest text ("St…").
	it('keeps the text of each select whole in a container that sizes to its content', () => {
		renderUI(
			<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
				<QueryBuilder fields={statusFields} defaultValue={statusRule()} />
			</div>,
		)

		expect(fits(screen.getByRole('combobox', { name: 'Field' }))).toBe(true)

		expect(fits(screen.getByRole('combobox', { name: 'Operator' }))).toBe(true)

		expect(fits(screen.getByRole('combobox', { name: 'Status value' }))).toBe(true)
	})

	// The parts have a minimum width, so in a narrow container they wrap to a
	// new line and do not push the row past its edge.
	it('wraps the parts in a narrow container and does not overflow the rule', () => {
		const { container } = renderUI(
			<div style={{ width: 300 }}>
				<QueryBuilder
					fields={fields}
					defaultValue={createGroup('and', [
						{ id: 'r', type: 'rule', field: 'age', operator: 'between', value: ['', ''] },
					])}
				/>
			</div>,
		)

		const rule = container.querySelector<HTMLElement>('[data-slot="query-rule"]')

		if (!rule) throw new Error('no rule')

		expect(rule.scrollWidth).toBeLessThanOrEqual(rule.clientWidth)
	})
})
