import { defineColors, type VariantProps } from '../../core/recipe'
import { bridge } from '../katakana'
import { kokkaku, type Step } from '../kiso'
import { control } from '../kiso/control'

const { checkbox } = kokkaku

const color = defineColors({
	zinc: '[--check-mark:var(--color-white)] [--check-bg:var(--color-zinc-600)] [--check-border:var(--color-zinc-700)]/90',
	...control.check.color,
})

export const k = bridge.check(control, {
	base: [
		'has-checked:*:data-[slot=checkbox-check]:opacity-100',
		'has-[:indeterminate]:*:data-[slot=checkbox-check]:opacity-100',
		'[--check-border:transparent]',
		'has-checked:bg-(--check-bg) has-checked:border-(--check-border)',
		'has-[disabled]:cursor-not-allowed has-[disabled]:opacity-50',
		'has-[:indeterminate]:bg-(--check-bg) has-[:indeterminate]:border-(--check-border)',
		'not-has-[:disabled]:has-checked:hover:opacity-90',
		'not-has-[:disabled]:has-[:indeterminate]:hover:opacity-90',
		// The box and its check mark take the step of the nearest density scope.
		'density-size-[4,5,5] density-rounded-[0.75,1,1.25]',
		'*:data-[slot=checkbox-check]:density-size-[3,3.5,4]',
	],
	color,
	skeleton: checkbox,
})

/** Recipe variant props for {@link Checkbox}: the `color` axis of its kata, and the `size` step that the component writes as a density scope. */
export type CheckboxVariants = VariantProps<typeof k> & { size?: Step }
