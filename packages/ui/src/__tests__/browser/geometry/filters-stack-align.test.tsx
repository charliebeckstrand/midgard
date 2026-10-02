import { beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { Label } from '../../../components/fieldset'
import {
	Filters,
	FiltersBar,
	FiltersClear,
	FiltersField,
	FiltersRow,
} from '../../../components/filters'
import { Input } from '../../../components/input'
import { present, renderUI } from '../../helpers'
import { PIXEL } from '../../helpers/geometry/tolerance'

/**
 * A `stack` bar is a row from the `sm` breakpoint. In a row, a Clear button with
 * no label must line up with the controls, not with the labels above them. The
 * viewport sits between `sm` (640px) and `md` (768px), where the axis and the
 * alignment of the bar once flipped at two different breakpoints.
 */
describe('Filters stack alignment (real browser)', () => {
	beforeAll(() => page.viewport(700, 600))

	it('puts a label-less Clear on the bottom edge of the controls', () => {
		const { container } = renderUI(
			<Filters aria-label="Filters">
				<FiltersBar>
					<FiltersRow>
						<FiltersField name="search">
							<Label>Search</Label>
							<Input placeholder="Search" />
						</FiltersField>
					</FiltersRow>
					<FiltersClear>Clear</FiltersClear>
				</FiltersBar>
			</Filters>,
		)

		const input = present(container.querySelector('[data-slot="control-frame"]'), 'input frame')

		const clear = present(container.querySelector('[data-slot="filter-clear"]'), 'clear')

		expect(clear.getBoundingClientRect().bottom).toBeNear(
			input.getBoundingClientRect().bottom,
			PIXEL,
		)
	})
})

/**
 * A `rail` bar is one row at every width. A Clear button with no label must
 * line up with the controls of the row, not with the label and the control
 * together. The bar once centered its regions, which put Clear about half a
 * label height above the controls.
 */
describe('Filters rail alignment (real browser)', () => {
	beforeAll(() => page.viewport(1024, 600))

	it('puts the middle of a label-less Clear on the middle of the controls', () => {
		const { container } = renderUI(
			<Filters aria-label="Filters" layout="rail">
				<FiltersBar>
					<FiltersRow>
						<FiltersField name="search" className="w-48">
							<Label>Search</Label>
							<Input placeholder="Search" />
						</FiltersField>
						<FiltersField name="status" className="w-48">
							<Label>Status</Label>
							<Input placeholder="Status" />
						</FiltersField>
					</FiltersRow>
					<FiltersClear>Clear</FiltersClear>
				</FiltersBar>
			</Filters>,
		)

		const input = present(container.querySelector('[data-slot="control-frame"]'), 'input frame')

		const clear = present(container.querySelector('[data-slot="filter-clear"]'), 'clear')

		const middle = (rect: DOMRect) => (rect.top + rect.bottom) / 2

		expect(middle(clear.getBoundingClientRect())).toBeNear(
			middle(input.getBoundingClientRect()),
			PIXEL,
		)
	})
})
