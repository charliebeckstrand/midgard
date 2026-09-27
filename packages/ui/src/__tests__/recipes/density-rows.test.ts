// @vitest-environment node
import { clsx } from 'clsx'
import { describe, expect, it } from 'vitest'
import { k as badge } from '../../recipes/kata/badge'
import { k as card } from '../../recipes/kata/card'
import { k as table } from '../../recipes/kata/table'
import { kasane, ma, sun } from '../../recipes/kiso'
import { steps } from '../../recipes/kiso/sun'

// A static leaf with no `size` follows the nearest density scope through
// `density-*` rows (packages/ui/tailwind.css). Tailwind scans whole class
// literals, so each kata spells its rows out by hand. Every expectation here
// derives the row from the source table that the explicit `size` path reads,
// so a row that drifts from its source fails.

/** Splits a class value into single classes. */
const classes = (value: Parameters<typeof clsx>[0]) => clsx(value).split(/\s+/).filter(Boolean)

/** The density row of `step` for a source class value. */
const row = (step: string, value: Parameters<typeof clsx>[0]) =>
	classes(value).map((name) => `density-${step}:${name}`)

describe('density rows', () => {
	it.each(steps)('keeps the Badge %s rows in step with its size and pill rows', (step) => {
		expect(classes(badge.density.size[step])).toEqual(row(step, badge.config.variants.size?.[step]))

		const pill = badge.config.compound.find((rule) => rule.radius === 'full' && rule.size === step)

		expect(classes(badge.density.pill[step])).toEqual(row(step, pill?.class))
	})

	it.each(steps)('keeps the Card %s row in step with its padding, radius, and slots', (step) => {
		expect(classes(card.density[step])).toEqual(
			row(step, [ma.p[step], kasane.rounded[sun[step].radius], card.slots[step]]),
		)
	})

	it.each(steps)('keeps the Table %s row in step with the cell padding', (step) => {
		const cell = classes(table.cell.config.variants.density?.[step])

		const projected = ['td', 'th'].flatMap((element) =>
			cell.map((name) => `[&>*>tr>${element}]:${name}`),
		)

		expect(classes(table.projection.scoped[step])).toEqual(row(step, projected))
	})
})
