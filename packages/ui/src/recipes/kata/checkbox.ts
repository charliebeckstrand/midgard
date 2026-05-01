import { tv, type VariantProps } from 'tailwind-variants'
import { defineColors } from '../../core/recipe/mode'
import { iro } from '../iro'
import { sen } from '../sen'
import { control } from './_control'

const color = defineColors({
	zinc: {
		light:
			'[--checkbox-check:var(--color-white)] [--checkbox-checked-bg:var(--color-zinc-900)] [--checkbox-checked-border:var(--color-zinc-950)]/90',
		dark: 'dark:[--checkbox-checked-bg:var(--color-zinc-600)] dark:[--checkbox-checked-border:var(--color-zinc-700)]/90',
	},
	red: '[--checkbox-check:var(--color-white)] [--checkbox-checked-bg:var(--color-red-600)] [--checkbox-checked-border:var(--color-red-800)]/90',
	amber:
		'[--checkbox-check:var(--color-amber-100)] [--checkbox-checked-bg:var(--color-amber-700)] [--checkbox-checked-border:var(--color-amber-600)]/80',
	green:
		'[--checkbox-check:var(--color-white)] [--checkbox-checked-bg:var(--color-green-600)] [--checkbox-checked-border:var(--color-green-800)]/90',
	blue: '[--checkbox-check:var(--color-white)] [--checkbox-checked-bg:var(--color-blue-600)] [--checkbox-checked-border:var(--color-blue-800)]/90',
})

export const checkbox = tv({
	base: [
		'inline-flex',
		'items-center justify-center',
		'relative',
		sen.focus.outline,
		'has-checked:*:data-[slot=checkbox-check]:opacity-100',
		...control.check.surface,
		'[--checkbox-checked-border:transparent]',
		'has-checked:bg-(--checkbox-checked-bg) has-checked:border-(--checkbox-checked-border)',
		'not-has-[:disabled]:has-checked:hover:opacity-90',
		'has-[disabled]:cursor-not-allowed has-[disabled]:opacity-50',
	],
	variants: {
		color,
		size: {
			sm: ['size-4', 'rounded-[--spacing(0.75)]'],
			md: ['size-4.5', 'rounded-[--spacing(1)]'],
			lg: ['size-5', 'rounded-[--spacing(1.25)]'],
		},
	},
	defaultVariants: { color: 'zinc', size: 'md' },
})

/** Check-icon size class per checkbox size step. Read by the component. */
export const checkboxCheckSize = {
	sm: 'size-3',
	md: 'size-3.5',
	lg: 'size-4',
} as const

export const checkboxInput = tv({ base: control.check.hidden })

export const slots = { disabled: iro.text.disabled }

export type CheckboxVariants = VariantProps<typeof checkbox>
