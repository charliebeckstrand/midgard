import { defineColors, type VariantPropsOf } from '../../core/recipe'
import { check } from '../katakana'
import { kokkaku } from '../kiso'

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

export const k = check(
	{
		base: [
			'has-checked:*:data-[slot=radio-indicator]:opacity-100',
			'rounded-full',
			'[--radio-checked-border:transparent]',
			'has-checked:bg-(--radio-checked-bg) has-checked:border-(--radio-checked-border)',
			'not-has-[:disabled]:has-checked:hover:opacity-90',
		],
		color,
		size: {
			sm: 'size-4',
			md: 'size-4.5',
			lg: 'size-5',
		},
		skeleton: kokkaku.radio,
	},
	{
		/** Indicator dot size class per radio size step. Read by the component. */
		indicatorSize: {
			sm: 'size-1',
			md: 'size-1.5',
			lg: 'size-2',
		} as const,
	},
)

export type RadioVariants = VariantPropsOf<typeof k>
