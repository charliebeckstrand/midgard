import { defineRecipe, mode, type VariantProps } from '../../core/recipe'
import { iro, ji, kasane, narabi } from '../kiso'

const { text } = iro
const { size, weight } = ji
const { rounded } = kasane
const { flex } = narabi

/**
 * Per-colour fill / bg / stroke classes shared between bar + gauge. The
 * gauge reads all three (`fill` on the indicator circle, `stroke` on the
 * track, `bg` on the central label); `bar.fill` indexes into the
 * `bg` slice for its colour axis.
 */
const color = {
	zinc: {
		fill: mode('fill-zinc-600', 'dark:fill-zinc-400'),
		bg: mode('bg-zinc-600', 'dark:bg-zinc-400'),
		stroke: mode('stroke-zinc-600', 'dark:stroke-zinc-400'),
	},
	red: {
		fill: mode('fill-red-600', 'dark:fill-red-500'),
		bg: mode('bg-red-600', 'dark:bg-red-500'),
		stroke: mode('stroke-red-600', 'dark:stroke-red-500'),
	},
	amber: {
		fill: mode('fill-amber-600', 'dark:fill-amber-500'),
		bg: mode('bg-amber-600', 'dark:bg-amber-500'),
		stroke: mode('stroke-amber-600', 'dark:stroke-amber-500'),
	},
	green: {
		fill: mode('fill-green-600', 'dark:fill-green-500'),
		bg: mode('bg-green-600', 'dark:bg-green-500'),
		stroke: mode('stroke-green-600', 'dark:stroke-green-500'),
	},
	blue: {
		fill: mode('fill-blue-600', 'dark:fill-blue-500'),
		bg: mode('bg-blue-600', 'dark:bg-blue-500'),
		stroke: mode('stroke-blue-600', 'dark:stroke-blue-500'),
	},
}

const fill = defineRecipe({
	base: ['h-full', rounded.full],
	color: {
		zinc: color.zinc.bg,
		red: color.red.bg,
		amber: color.amber.bg,
		green: color.green.bg,
		blue: color.blue.bg,
	},
	defaults: { color: 'zinc' },
})

const root = defineRecipe({
	base: ['relative', flex.inline, 'justify-center'],
	size: {
		sm: 'size-12',
		md: 'size-16',
		lg: 'size-20',
		xl: 'size-24',
	},
	defaults: { size: 'md' },
})

const label = defineRecipe({
	base: ['absolute', weight.semibold, ...text.default],
	size: {
		sm: size.xs,
		md: size.sm,
		lg: size.md,
		xl: size.lg,
	},
	defaults: { size: 'md' },
})

export const k = defineRecipe(
	{
		base: ['overflow-hidden', rounded.full, ...mode('bg-zinc-200', 'dark:bg-zinc-800')],
		size: {
			sm: 'h-2',
			md: 'h-3',
			lg: 'h-4',
		},
		defaults: { size: 'md' },
	},
	{
		color,
		bar: {
			fill,
			indeterminate: 'w-1/3 animate-[progress-indeterminate_1.5s_ease-in-out_infinite]',
		},
		gauge: {
			root,
			label,
			track: mode('stroke-zinc-200', 'dark:stroke-zinc-700'),
		},
	},
)

export type ProgressTrackVariants = VariantProps<typeof k>
export type ProgressBarFillVariants = VariantProps<typeof fill>
export type ProgressGaugeVariants = VariantProps<typeof root>
