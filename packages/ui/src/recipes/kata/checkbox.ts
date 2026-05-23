import { defineColors, type VariantProps } from '../../core/recipe'
import { check } from '../katakana'
import { kasane, kokkaku } from '../kiso'

const color = defineColors({
	zinc: '[--checkbox-check:var(--color-white)] [--checkbox-checked-bg:var(--color-zinc-600)] [--checkbox-checked-border:var(--color-zinc-700)]/90',
	red: '[--checkbox-check:var(--color-white)] [--checkbox-checked-bg:var(--color-red-600)] [--checkbox-checked-border:var(--color-red-800)]/90',
	amber:
		'[--checkbox-check:var(--color-amber-100)] [--checkbox-checked-bg:var(--color-amber-700)] [--checkbox-checked-border:var(--color-amber-600)]/80',
	green:
		'[--checkbox-check:var(--color-white)] [--checkbox-checked-bg:var(--color-green-600)] [--checkbox-checked-border:var(--color-green-800)]/90',
	blue: '[--checkbox-check:var(--color-white)] [--checkbox-checked-bg:var(--color-blue-600)] [--checkbox-checked-border:var(--color-blue-800)]/90',
})

export const k = check(
	{
		base: [
			'has-checked:*:data-[slot=checkbox-check]:opacity-100',
			'has-[:indeterminate]:*:data-[slot=checkbox-check]:opacity-100',
			'[--checkbox-checked-border:transparent]',
			'has-checked:bg-(--checkbox-checked-bg) has-checked:border-(--checkbox-checked-border)',
			'has-[disabled]:cursor-not-allowed has-[disabled]:opacity-50',
			'has-[:indeterminate]:bg-(--checkbox-checked-bg) has-[:indeterminate]:border-(--checkbox-checked-border)',
			'not-has-[:disabled]:has-checked:hover:opacity-90',
			'not-has-[:disabled]:has-[:indeterminate]:hover:opacity-90',
		],
		color,
		size: {
			sm: ['size-4', kasane.r('0.75')],
			md: ['size-4.5', kasane.r('1')],
			lg: ['size-5', kasane.r('1.25')],
		},
		skeleton: kokkaku.checkbox,
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

export type CheckboxVariants = VariantProps<typeof k>
