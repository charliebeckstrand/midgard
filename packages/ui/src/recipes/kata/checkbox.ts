import { defineColors, type VariantProps } from '../../core/recipe'
import { bridge } from '../katakana'
import { kasane, kokkaku } from '../kiso'
import { control } from '../kiso/control'

const { radius } = kasane
const { checkbox } = kokkaku

const color = defineColors({
	zinc: '[--check-mark:var(--color-white)] [--check-bg:var(--color-zinc-600)] [--check-border:var(--color-zinc-700)]/90',
	...control.check.color,
})

export const k = bridge.check(
	control,
	{
		base: [
			'has-checked:*:data-[slot=checkbox-check]:opacity-100',
			'has-[:indeterminate]:*:data-[slot=checkbox-check]:opacity-100',
			'[--check-border:transparent]',
			'has-checked:bg-(--check-bg) has-checked:border-(--check-border)',
			'has-[disabled]:cursor-not-allowed has-[disabled]:opacity-50',
			'has-[:indeterminate]:bg-(--check-bg) has-[:indeterminate]:border-(--check-border)',
			'not-has-[:disabled]:has-checked:hover:opacity-90',
			'not-has-[:disabled]:has-[:indeterminate]:hover:opacity-90',
		],
		color,
		size: {
			sm: ['size-4', radius.r('0.75')],
			md: ['size-4.5', radius.r('1')],
			lg: ['size-5', radius.r('1.25')],
		},
		skeleton: checkbox,
	},
	{
		/** Check-icon size class per checkbox size step. Read by the component. */
		checkSize: {
			sm: 'size-3',
			md: 'size-3.5',
			lg: 'size-4',
		} as const,
	},
)

/** Recipe variant props for {@link Checkbox} — the styling axes its kata exposes (`color`, `size`), for consumers composing custom slots. */
export type CheckboxVariants = VariantProps<typeof k>
