import type { ReactElement } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Checkbox, CheckboxField } from '../../components/checkbox'
import { Label } from '../../components/fieldset'
import { Radio, RadioField } from '../../components/radio'
import { bySlot, present, renderUI } from '../helpers'

/**
 * A checked Checkbox or Radio keeps its accent border under the pointer, in both modes.
 *
 * The neutral hover border of the check surface had a higher specificity than the checked border
 * of the kata. So a hover on the box or on its label replaced the accent border with a gray one.
 * The neutral hover now skips the checked state and the indeterminate state of a checkbox. A
 * checked box keeps only the opacity hover of its kata.
 *
 * Each case reads the visible box `[data-slot="control"]`. The overlay input has no border rule,
 * so a read of the input shows no change. The file runs in the real browser, because jsdom loads
 * no stylesheet.
 */
describe('the border of a check control under the pointer (real browser)', () => {
	afterEach(() => {
		document.documentElement.classList.remove('dark')
	})

	/** Each control sits in its toggle field with a Label, so a case can hover the box or the label. */
	const fields = {
		'a checked Checkbox': () => (
			<CheckboxField>
				<Checkbox color="blue" defaultChecked />
				<Label>Accept the terms</Label>
			</CheckboxField>
		),
		'an indeterminate Checkbox': () => (
			<CheckboxField>
				<Checkbox color="blue" indeterminate />
				<Label>Select all</Label>
			</CheckboxField>
		),
		'a checked Radio': () => (
			<RadioField>
				<Radio color="blue" name="plan" value="basic" defaultChecked />
				<Label>Basic</Label>
			</RadioField>
		),
		'an unchecked Checkbox': () => (
			<CheckboxField>
				<Checkbox color="blue" />
				<Label>Accept the terms</Label>
			</CheckboxField>
		),
		// No radio of its group is checked, so its input matches `:indeterminate`.
		'an unchecked Radio': () => (
			<RadioField>
				<Radio color="blue" name="plan" value="basic" />
				<Label>Basic</Label>
			</RadioField>
		),
	} satisfies Record<string, () => ReactElement>

	type Field = keyof typeof fields

	type Target = 'box' | 'label'

	async function borderBeforeAndAfterHover(field: Field, target: Target, dark: boolean) {
		if (dark) document.documentElement.classList.add('dark')

		const { container } = renderUI(fields[field]())

		const box = present(bySlot(container, 'control'), 'check box')

		const before = getComputedStyle(box).borderTopColor

		await userEvent.hover(target === 'box' ? box : present(bySlot(container, 'label'), 'label'))

		return { before, after: getComputedStyle(box).borderTopColor }
	}

	describe.each([
		['light', false],
		['dark', true],
	])('in %s mode', (_mode, dark) => {
		it.each<[Field, Target]>([
			['a checked Checkbox', 'box'],
			['a checked Checkbox', 'label'],
			['an indeterminate Checkbox', 'box'],
			['an indeterminate Checkbox', 'label'],
			['a checked Radio', 'box'],
			['a checked Radio', 'label'],
		])('%s keeps its border on a hover of the %s', async (field, target) => {
			const { before, after } = await borderBeforeAndAfterHover(field, target, dark)

			expect(after).toBe(before)
		})

		/**
		 * The server HTML carries `data-indeterminate`, and only a client effect sets the
		 * `indeterminate` property. The guard must read the attribute, so the box keeps its border
		 * before the effect runs. The case clears the property to stand for that markup.
		 */
		it('an indeterminate Checkbox with no indeterminate property keeps its border on a hover', async () => {
			if (dark) document.documentElement.classList.add('dark')

			const { container } = renderUI(fields['an indeterminate Checkbox']())

			const input = present(container.querySelector<HTMLInputElement>('input'), 'input')

			input.indeterminate = false

			const box = present(bySlot(container, 'control'), 'check box')

			const before = getComputedStyle(box).borderTopColor

			await userEvent.hover(box)

			expect(getComputedStyle(box).borderTopColor).toBe(before)
		})

		/**
		 * The neutral hover still exists. A guard that removed it everywhere would pass the cases
		 * above. The Radio case also stops a guard on each `:indeterminate` input, which would remove
		 * the hover from a radio group with no selection.
		 */
		it.each<[Field, Target]>([
			['an unchecked Checkbox', 'box'],
			['an unchecked Checkbox', 'label'],
			['an unchecked Radio', 'box'],
			['an unchecked Radio', 'label'],
		])('%s still darkens its border on a hover of the %s', async (field, target) => {
			const { before, after } = await borderBeforeAndAfterHover(field, target, dark)

			expect(after).not.toBe(before)
		})
	})
})
