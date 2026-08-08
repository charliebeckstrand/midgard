/**
 * Progress kata: object-literal surface serving both the linear `<Progress>`
 * bar and the radial gauge. Carries a local per-colour `bg` / `stroke` table
 * authored inline with `mode()` rather than the shared `iro.palette`, since the
 * SVG gauge needs a `stroke` variant the palette doesn't provide; the bar reads
 * the `bg` slice, the gauge reads the `stroke` slice.
 */
import { defineRecipe, mode, type VariantProps } from '../../core/recipe'
import { iro, ji, kasane, kokkaku, narabi, ugoki } from '../kiso'

const { text } = iro
const { size, weight } = ji
const { rounded } = kasane
const { flex } = narabi
const { spring } = ugoki

/**
 * Per-colour bg / stroke classes shared between bar and gauge: the bar's `fill`
 * recipe reads the `bg` slice, the gauge's indicator ring reads the `stroke`
 * slice (its track and label use fixed tokens, not this table).
 */
const color = {
	zinc: {
		bg: mode('bg-zinc-600', 'dark:bg-zinc-400'),
		stroke: mode('stroke-zinc-600', 'dark:stroke-zinc-400'),
	},
	red: {
		bg: mode('bg-red-600', 'dark:bg-red-500'),
		stroke: mode('stroke-red-600', 'dark:stroke-red-500'),
	},
	amber: {
		bg: mode('bg-amber-600', 'dark:bg-amber-500'),
		stroke: mode('stroke-amber-600', 'dark:stroke-amber-500'),
	},
	green: {
		bg: mode('bg-green-600', 'dark:bg-green-500'),
		stroke: mode('stroke-green-600', 'dark:stroke-green-500'),
	},
	blue: {
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
	},
	defaults: { size: 'md' },
})

const label = defineRecipe({
	base: ['absolute', weight.semibold, ...text.default],
	size: {
		sm: size.xs,
		md: size.sm,
		lg: size.md,
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
		skeleton: kokkaku.progress,
	},
	{
		color,
		/** Value-fill settle: the bar and gauge sweep to their value on this spring. */
		spring: spring.settle,
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

/** Recipe variant props for the {@link Progress} track — its styling axes (`size`), for consumers composing custom slots. */
export type ProgressTrackVariants = VariantProps<typeof k>
export type ProgressBarFillVariants = VariantProps<typeof fill>
/** Recipe variant props for the {@link Progress} gauge root — its styling axes (`size`), for consumers composing custom slots. */
export type ProgressGaugeVariants = VariantProps<typeof root>
