import type { ReactElement } from 'react'
import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Checkbox } from '../../../components/checkbox'
import { Radio, RadioGroup } from '../../../components/radio'
import { Switch } from '../../../components/switch'
import { present, renderUI, screen } from '../../helpers'

/**
 * The hit area of a bare check control, in a real browser. Checkbox, Radio,
 * and Switch put a `TouchTarget` in the label that holds the input. At `sm`
 * the box of a checkbox or a radio and the track of a switch are under the
 * 24px floor of a fine pointer. A real press in the rim between the box and the
 * floor toggles the control, and the box keeps its own size.
 */
const controls: Array<[string, string, ReactElement]> = [
	['Checkbox', 'checkbox', <Checkbox key="c" size="sm" aria-label="Control" />],
	[
		'Radio',
		'radio',
		<RadioGroup key="r" aria-label="Group">
			<Radio size="sm" value="a" aria-label="Control" />
		</RadioGroup>,
	],
	['Switch', 'switch', <Switch key="s" size="sm" aria-label="Control" />],
]

describe('check control hit area (real browser)', () => {
	it.each(controls)(
		'%s toggles on a press in the rim of the floor',
		async (_name, role, element) => {
			renderUI(<div style={{ padding: 64 }}>{element}</div>)

			const input = screen.getByRole(role, { name: 'Control' }) as HTMLInputElement

			const host = present(input.closest<HTMLElement>('[data-slot="control"]'), 'the host')

			const span = present(
				host.querySelector<HTMLElement>('[data-slot="touch-target"]'),
				'the hit area',
			)

			const box = host.getBoundingClientRect()

			const area = span.getBoundingClientRect()

			// The box stays under the floor, and only the hit area grows to it.
			expect(box.height).toBeLessThan(24)

			expect(area.height).toBe(24)

			expect(area.width).toBe(Math.max(24, box.width))

			// One pixel above the box, inside the rim of the floor.
			await userEvent.click(host, { position: { x: box.width / 2, y: -1 } })

			expect(input.checked).toBe(true)
		},
	)
})
