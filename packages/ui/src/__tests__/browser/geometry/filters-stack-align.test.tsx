import { beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { Label } from '../../../components/fieldset'
import { Input } from '../../../components/input'
import {
	FormFilters,
	FormFiltersBar,
	FormFiltersClear,
	FormFiltersField,
	FormFiltersRow,
} from '../../../modules/form'
import { present, renderUI } from '../../helpers'
import { PIXEL } from '../../helpers/geometry/tolerance'

/**
 * A `stack` bar is a row from the `sm` breakpoint. In a row, a Clear button with
 * no label must line up with the controls, not with the labels above them. The
 * viewport sits between `sm` (640px) and `md` (768px), where the axis and the
 * alignment of the bar once flipped at two different breakpoints.
 */
describe('FormFilters stack alignment (real browser)', () => {
	beforeAll(() => page.viewport(700, 600))

	it('puts a label-less Clear on the bottom edge of the controls', () => {
		const { container } = renderUI(
			<FormFilters aria-label="Filters">
				<FormFiltersBar>
					<FormFiltersRow>
						<FormFiltersField name="search">
							<Label>Search</Label>
							<Input placeholder="Search" />
						</FormFiltersField>
					</FormFiltersRow>
					<FormFiltersClear>Clear</FormFiltersClear>
				</FormFiltersBar>
			</FormFilters>,
		)

		const input = present(container.querySelector('[data-slot="control-frame"]'), 'input frame')

		const clear = present(container.querySelector('[data-slot="form-filters-clear"]'), 'clear')

		expect(clear.getBoundingClientRect().bottom).toBeNear(
			input.getBoundingClientRect().bottom,
			PIXEL,
		)
	})

	it('keeps the width of the fields when Clear appears', async () => {
		const { container } = renderUI(
			<FormFilters aria-label="Filters">
				<FormFiltersBar>
					<FormFiltersRow>
						<FormFiltersField name="search">
							<Label>Search</Label>
							<Input placeholder="Search" />
						</FormFiltersField>
					</FormFiltersRow>
					<FormFiltersClear>Clear</FormFiltersClear>
				</FormFiltersBar>
			</FormFilters>,
		)

		const input = present(container.querySelector('[data-slot="control-frame"]'), 'input frame')

		const before = input.getBoundingClientRect().width

		await page.getByRole('textbox').fill('a')

		expect(input.getBoundingClientRect().width).toBeNear(before, PIXEL)
	})
})

/**
 * A `rail` bar is one row at every width. A Clear button with no label must
 * line up with the controls of the row, not with the label and the control
 * together. The bar once centered its regions, which put Clear about half a
 * label height above the controls.
 */
describe('FormFilters rail alignment (real browser)', () => {
	beforeAll(() => page.viewport(1024, 600))

	it('puts the middle of a label-less Clear on the middle of the controls', () => {
		const { container } = renderUI(
			// A Clear shows only while a field holds a value.
			<FormFilters aria-label="Filters" layout="rail" value={{ search: 'a' }}>
				<FormFiltersBar>
					<FormFiltersRow>
						<FormFiltersField name="search" className="w-48">
							<Label>Search</Label>
							<Input placeholder="Search" />
						</FormFiltersField>
						<FormFiltersField name="status" className="w-48">
							<Label>Status</Label>
							<Input placeholder="Status" />
						</FormFiltersField>
					</FormFiltersRow>
					<FormFiltersClear>Clear</FormFiltersClear>
				</FormFiltersBar>
			</FormFilters>,
		)

		const input = present(container.querySelector('[data-slot="control-frame"]'), 'input frame')

		const clear = present(container.querySelector('[data-slot="form-filters-clear"]'), 'clear')

		const middle = (rect: DOMRect) => (rect.top + rect.bottom) / 2

		expect(middle(clear.getBoundingClientRect())).toBeNear(
			middle(input.getBoundingClientRect()),
			PIXEL,
		)
	})
})
