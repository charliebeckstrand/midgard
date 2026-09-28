import type { DensityStep } from '../../core/density'
import { defineColors, type VariantProps } from '../../core/recipe'
import { bridge } from '../katakana'
import { kasane, kokkaku } from '../kiso'
import { control } from '../kiso/control'

const { rounded } = kasane
const { radio } = kokkaku

const color = defineColors({
	zinc: {
		light:
			'[--check-bg:var(--color-zinc-900)] [--check-border:var(--color-zinc-950)]/90 [--check-mark:var(--color-white)]',
		dark: 'dark:[--check-bg:var(--color-zinc-600)] dark:[--check-border:var(--color-zinc-700)]/90',
	},
	...control.check.color,
})

export const k = bridge.check(control, {
	base: [
		'has-checked:*:data-[slot=radio-indicator]:opacity-100',
		rounded.full,
		'[--check-border:transparent]',
		'has-checked:bg-(--check-bg) has-checked:border-(--check-border)',
		'not-has-[:disabled]:has-checked:hover:opacity-90',
		// The circle and its dot take the step of the nearest density scope.
		'density-size-[4,5,5]',
		'*:data-[slot=radio-indicator]:density-size-[1,1.5,2]',
	],
	color,
	skeleton: radio,
})

/** Recipe variant props for {@link Radio}: the `color` axis of its kata, and the `size` step that the component writes as a density scope. */
export type RadioVariants = VariantProps<typeof k> & { size?: DensityStep }
