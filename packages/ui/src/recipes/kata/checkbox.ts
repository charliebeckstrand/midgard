import { defineColors, defineRecipe, type VariantPropsOf } from '../../core/recipe'
import { control } from '../genkei/control'
import { iro, kokkaku, sen } from '../kiso'

const { check } = control

const color = defineColors({
	zinc: '[--checkbox-check:var(--color-white)] [--checkbox-checked-bg:var(--color-zinc-600)] [--checkbox-checked-border:var(--color-zinc-700)]/90',
	red: '[--checkbox-check:var(--color-white)] [--checkbox-checked-bg:var(--color-red-600)] [--checkbox-checked-border:var(--color-red-800)]/90',
	amber:
		'[--checkbox-check:var(--color-amber-100)] [--checkbox-checked-bg:var(--color-amber-700)] [--checkbox-checked-border:var(--color-amber-600)]/80',
	green:
		'[--checkbox-check:var(--color-white)] [--checkbox-checked-bg:var(--color-green-600)] [--checkbox-checked-border:var(--color-green-800)]/90',
	blue: '[--checkbox-check:var(--color-white)] [--checkbox-checked-bg:var(--color-blue-600)] [--checkbox-checked-border:var(--color-blue-800)]/90',
})

export const k = defineRecipe(
	{
		base: [
			'relative',
			'inline-flex items-center justify-center',
			sen.focus.outline,
			'has-checked:*:data-[slot=checkbox-check]:opacity-100',
			'has-[:indeterminate]:*:data-[slot=checkbox-check]:opacity-100',
			...check.surface,
			'[--checkbox-checked-border:transparent]',
			'has-checked:bg-(--checkbox-checked-bg) has-checked:border-(--checkbox-checked-border)',
			'has-[disabled]:cursor-not-allowed has-[disabled]:opacity-50',
			'has-[:indeterminate]:bg-(--checkbox-checked-bg) has-[:indeterminate]:border-(--checkbox-checked-border)',
			'not-has-[:disabled]:has-checked:hover:opacity-90',
			'not-has-[:disabled]:has-[:indeterminate]:hover:opacity-90',
		],
		color,
		size: {
			sm: ['size-4', 'rounded-[--spacing(0.75)]'],
			md: ['size-4.5', 'rounded-[--spacing(1)]'],
			lg: ['size-5', 'rounded-[--spacing(1.25)]'],
		},
		defaults: { color: 'zinc', size: 'md' },
	},
	{
		input: defineRecipe({ base: check.hidden }),
		/** Check-icon size class per checkbox size step. Read by the component. */
		checkSize: {
			sm: 'size-3',
			md: 'size-3.5',
			lg: 'size-4',
		} as const,
		/** Disabled-state text class shared by the checkbox field wrapper. */
		disabled: iro.text.disabled,
		skeleton: kokkaku.checkbox,
	},
)

export type CheckboxVariants = VariantPropsOf<typeof k>
