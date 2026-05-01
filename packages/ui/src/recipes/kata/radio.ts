import { tv, type VariantProps } from 'tailwind-variants'
import { defineColors } from '../../core/recipe/mode'
import { iro } from '../ryu/iro'
import { kumi } from '../ryu/kumi'
import { maru } from '../ryu/maru'
import { sawari } from '../ryu/sawari'
import { sen } from '../ryu/sen'
import { control } from '../waku/control'

const color = defineColors({
	zinc: {
		light:
			'[--radio-checked-bg:var(--color-zinc-900)] [--radio-checked-border:var(--color-zinc-950)]/90 [--radio-checked-indicator:var(--color-white)]',
		dark: 'dark:[--radio-checked-bg:var(--color-zinc-600)] dark:[--radio-checked-border:var(--color-zinc-700)]/90',
	},
	red: '[--radio-checked-indicator:var(--color-white)] [--radio-checked-bg:var(--color-red-600)] [--radio-checked-border:var(--color-red-800)]/90',
	amber:
		'[--radio-checked-bg:var(--color-amber-700)] [--radio-checked-border:var(--color-amber-600)]/80 [--radio-checked-indicator:var(--color-amber-100)]',
	green:
		'[--radio-checked-indicator:var(--color-white)] [--radio-checked-bg:var(--color-green-600)] [--radio-checked-border:var(--color-green-800)]/90',
	blue: '[--radio-checked-indicator:var(--color-white)] [--radio-checked-bg:var(--color-blue-600)] [--radio-checked-border:var(--color-blue-800)]/90',
})

export const radio = tv({
	base: [
		'inline-flex',
		kumi.center,
		'relative',
		sen.focus.outline,
		...sawari.cursor,
		'has-checked:*:data-[slot=radio-indicator]:opacity-100',
		...control.check.surface,
		maru.rounded.full,
		'[--radio-checked-border:transparent]',
		'has-checked:bg-(--radio-checked-bg) has-checked:border-(--radio-checked-border)',
		'not-has-[:disabled]:has-checked:hover:opacity-90',
	],
	variants: {
		color,
		size: {
			sm: 'size-4',
			md: 'size-4.5',
			lg: 'size-5',
		},
	},
	defaultVariants: { color: 'zinc', size: 'md' },
})

/** Indicator dot size class per radio size step. Read by the component. */
export const radioIndicatorSize = {
	sm: 'size-1',
	md: 'size-1.5',
	lg: 'size-2',
} as const

export const radioInput = tv({ base: control.check.hidden })

export const slots = { disabled: iro.text.disabled }

export type RadioVariants = VariantProps<typeof radio>
