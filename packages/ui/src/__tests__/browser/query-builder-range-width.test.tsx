import { beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { createGroup, QueryBuilder, type QueryField } from '../../modules/query'
import { renderUI, screen } from '../helpers'

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

		expect(Math.abs(field - operator)).toBeLessThanOrEqual(1)

		expect(Math.abs(range - 2 * field)).toBeLessThanOrEqual(2)
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

		expect(Math.abs(operator - field)).toBeLessThanOrEqual(1)

		expect(Math.abs(value - field)).toBeLessThanOrEqual(1)
	})
})
