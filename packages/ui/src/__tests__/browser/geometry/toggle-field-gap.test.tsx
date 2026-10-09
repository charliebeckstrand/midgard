import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { Checkbox, CheckboxField } from '../../../components/checkbox'
import { Label } from '../../../components/fieldset'
import { Radio, RadioField, RadioGroup } from '../../../components/radio'
import { type DensityStep, densitySteps } from '../../../core/density'
import { renderUI } from '../../helpers'

type Size = DensityStep

const fields: [string, (size: Size) => ReactNode][] = [
	[
		'CheckboxField',
		(size) => (
			<CheckboxField>
				<Checkbox size={size} />
				<Label>Accept the terms</Label>
			</CheckboxField>
		),
	],
	[
		'RadioField',
		(size) => (
			<RadioGroup aria-label="Plan">
				<RadioField>
					<Radio value="basic" size={size} />
					<Label>Basic</Label>
				</RadioField>
			</RadioGroup>
		),
	],
]

const cases = fields.flatMap(([name, field]) =>
	densitySteps.flatMap((size) =>
		(['ltr', 'rtl'] as const).map((dir) => [name, size, dir, field] as const),
	),
)

/**
 * The space between the box and the label of a toggle field. The first column
 * of the toggle grid was a fixed 1.125rem, and the box steps to 1rem, 1.25rem,
 * or 1.5rem. Thus the space was 14, 10, or 6px and not the 12px gap, and a box
 * at `md` or `lg` went past its column. The test reads the box
 * (`[data-slot="control"]`), not the overlay input, which is 2px smaller.
 */
describe('Toggle field: box to label gap', () => {
	it.each(cases)(
		'%s keeps the grid gap before the label of a %s box in %s',
		(_name, size, dir, field) => {
			const { container } = renderUI(<div dir={dir}>{field(size)}</div>)

			const row = container.querySelector<HTMLElement>('[data-slot="field"]')

			const box = container.querySelector('[data-slot="field"] > [data-slot="control"]')

			const label = container.querySelector('[data-slot="field"] > [data-slot="label"]')

			if (!row || !box || !label) throw new Error('expected the field, the box, and the label')

			const gap = Number.parseFloat(getComputedStyle(row).columnGap)

			const edges = row.getBoundingClientRect()

			const control = box.getBoundingClientRect()

			const text = label.getBoundingClientRect()

			if (dir === 'ltr') {
				expect(control.left).toBe(edges.left)

				expect(text.left - control.right).toBe(gap)
			} else {
				expect(control.right).toBe(edges.right)

				expect(control.left - text.right).toBe(gap)
			}
		},
	)
})
