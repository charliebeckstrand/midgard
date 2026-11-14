import type { ReactElement } from 'react'
import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Checkbox } from '../../components/checkbox'
import { Radio } from '../../components/radio'
import { Switch } from '../../components/switch'
import { present, renderUI } from '../helpers'

/**
 * A read-only check control keeps its resting paint on hover. The pointer does not change the
 * state, so a hover wash, a dim, or a darker border would give a false signal. Each case reads the
 * visible box `[data-slot="control"]`. The file runs in the real browser, because jsdom loads no
 * stylesheet and does not match `:hover`.
 */
describe('read-only check control hover (real browser)', () => {
	type State = { checked: boolean; readOnly?: boolean }

	const controls = {
		Switch: ({ checked, readOnly }: State) => (
			<Switch
				aria-label="Notifications"
				checked={checked}
				readOnly={readOnly}
				onChange={() => {}}
			/>
		),
		Checkbox: ({ checked, readOnly }: State) => (
			<Checkbox aria-label="Terms" checked={checked} readOnly={readOnly} onChange={() => {}} />
		),
		Radio: ({ checked, readOnly }: State) => (
			<Radio
				aria-label="Basic"
				name="plan"
				value="basic"
				checked={checked}
				readOnly={readOnly}
				onChange={() => {}}
			/>
		),
	} satisfies Record<string, (state: State) => ReactElement>

	async function paint(control: keyof typeof controls, state: State) {
		const { container } = renderUI(controls[control](state))

		const box = present(container.querySelector('[data-slot="control"]'), `${control} box`)

		const read = () => {
			const style = getComputedStyle(box)

			return {
				background: style.backgroundColor,
				border: style.borderColor,
				opacity: style.opacity,
			}
		}

		const before = read()

		await userEvent.hover(box)

		return { before, after: read() }
	}

	describe.each(Object.keys(controls) as (keyof typeof controls)[])('%s', (control) => {
		it('answers the hover when it is editable and off (control)', async () => {
			const { before, after } = await paint(control, { checked: false })
			expect(after).not.toEqual(before)
		})

		it('keeps its paint on hover when it is read-only and off', async () => {
			const { before, after } = await paint(control, { checked: false, readOnly: true })
			expect(after).toEqual(before)
		})

		it('dims on hover when it is editable and on (control)', async () => {
			const { before, after } = await paint(control, { checked: true })
			expect(after.opacity).not.toBe(before.opacity)
		})

		it('keeps its paint on hover when it is read-only and on', async () => {
			const { before, after } = await paint(control, { checked: true, readOnly: true })
			expect(after).toEqual(before)
		})
	})
})
