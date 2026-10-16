import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { Field, Label } from '../../../components/fieldset'
import { Input } from '../../../components/input'
import { Flex } from '../../../structure/flex'
import { Stack } from '../../../structure/stack'
import { renderUI } from '../../helpers'

const rows: [string, (label: ReactNode) => ReactNode][] = [
	['a Flex', (label) => <Flex gap="xs">{label}</Flex>],
	['a Stack', (label) => <Stack gap="xs">{label}</Stack>],
	['a Flex with its own anchor', (label) => <Flex data-slot="custom-row">{label}</Flex>],
]

/**
 * A label row in a Field: a child that holds the label beside an adornment. The
 * rules named the row by `data-slot="flex"`, so a Stack, or a Flex that a
 * wrapper re-anchored, lost the gap to the control and the weight of the label.
 * The rules now name the row by the label in it.
 */
describe('Field: label row', () => {
	it.each(rows)('%s takes the gap and the weight of a bare label', (_name, row) => {
		const { container } = renderUI(
			<div>
				<Field>
					<Label>Bare</Label>
					<Input />
				</Field>
				<Field>
					{row(<Label>In a row</Label>)}
					<Input />
				</Field>
			</div>,
		)

		const [bare, rowLabel] = container.querySelectorAll<HTMLElement>('[data-slot="label"]')

		const rowElement = rowLabel?.parentElement

		if (!bare || !rowLabel || !rowElement) throw new Error('expected two labels and a row')

		const bareGap = Number.parseFloat(getComputedStyle(bare).marginBottom)

		expect(bareGap).toBeGreaterThan(0)

		expect(Number.parseFloat(getComputedStyle(rowElement).marginBottom)).toBe(bareGap)

		expect(getComputedStyle(rowLabel).fontWeight).toBe(getComputedStyle(bare).fontWeight)
	})
})
