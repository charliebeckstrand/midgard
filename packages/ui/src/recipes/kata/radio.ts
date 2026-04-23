import { tv, type VariantProps } from 'tailwind-variants'
import { defineColors } from '../../core/recipe/mode'
import { iro } from '../iro'
import { ki } from '../ki'
import { kumi } from '../kumi'
import { maru } from '../maru'
import { waku } from '../waku'

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
		'size-4.5',
		ki.outline,
		'cursor-pointer',
		'has-checked:*:data-[slot=radio-indicator]:opacity-100',
		...waku.checkSurface,
		maru.rounded.full,
		'[--radio-checked-border:transparent]',
		'has-checked:bg-(--radio-checked-bg) has-checked:border-(--radio-checked-border)',
		'not-has-[:disabled]:has-checked:hover:opacity-90',
	],
	variants: {
		color,
	},
	defaultVariants: { color: 'zinc' },
})

export const radioInput = tv({ base: waku.hidden })

export const slots = { disabled: iro.text.disabled }

export type RadioVariants = VariantProps<typeof radio>
