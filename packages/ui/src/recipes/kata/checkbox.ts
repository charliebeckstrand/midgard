import { tv, type VariantProps } from 'tailwind-variants'
import { defineColors } from '../../core/recipe/mode'
import { iro } from '../iro'
import { kumi } from '../kumi'
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
		kumi.center,
		'relative',
		'size-4.5',
		sen.focus.outline,
		'cursor-pointer',
		'has-checked:*:data-[slot=checkbox-check]:opacity-100',
		...control.check.surface,
		'rounded-[--spacing(1)]',
		'[--checkbox-checked-border:transparent]',
		'has-checked:bg-(--checkbox-checked-bg) has-checked:border-(--checkbox-checked-border)',
		'not-has-[:disabled]:has-checked:hover:opacity-90',
	],
	variants: {
		color,
	},
	defaultVariants: { color: 'zinc' },
})

export const checkboxInput = tv({ base: control.check.hidden })

export const slots = { disabled: iro.text.disabled }

export type CheckboxVariants = VariantProps<typeof checkbox>
