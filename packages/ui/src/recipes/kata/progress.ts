/**
 * Progress kata: object-literal surface serving both the linear `<Progress>`
 * bar and the radial gauge. Carries a local per-colour `fill` / `bg` / `stroke`
 * table authored inline with `mode()` rather than the shared `iro.palette`,
 * since the SVG gauge needs `fill` / `stroke` variants the palette doesn't
 * provide; the bar reads the `bg` slice, the gauge reads all three.
 */
import { defineRecipe, mode, type VariantProps } from '../../core/recipe'
import { iro, ji, kasane, kokkaku, narabi } from '../kiso'

const { text } = iro
const { size, weight } = ji
const { rounded } = kasane
const { flex } = narabi

/**
 * Per-colour fill / bg / stroke classes shared between bar and gauge. The
 * gauge reads all three (`fill` on the indicator circle, `stroke` on the
 * track, `bg` on the central label); `bar.fill` uses the `bg` slice.
 */
const color = {
	neutral: {
		fill: mode('fill-neutral-600', 'dark:fill-neutral-400'),
		bg: mode('bg-neutral-600', 'dark:bg-neutral-400'),
		stroke: mode('stroke-neutral-600', 'dark:stroke-neutral-400'),
	},
	danger: {
		fill: mode('fill-danger-600', 'dark:fill-danger-500'),
		bg: mode('bg-danger-600', 'dark:bg-danger-500'),
		stroke: mode('stroke-danger-600', 'dark:stroke-danger-500'),
	},
	warning: {
		fill: mode('fill-warning-600', 'dark:fill-warning-500'),
		bg: mode('bg-warning-600', 'dark:bg-warning-500'),
		stroke: mode('stroke-warning-600', 'dark:stroke-warning-500'),
	},
	success: {
		fill: mode('fill-success-600', 'dark:fill-success-500'),
		bg: mode('bg-success-600', 'dark:bg-success-500'),
		stroke: mode('stroke-success-600', 'dark:stroke-success-500'),
	},
	primary: {
		fill: mode('fill-primary-600', 'dark:fill-primary-500'),
		bg: mode('bg-primary-600', 'dark:bg-primary-500'),
		stroke: mode('stroke-primary-600', 'dark:stroke-primary-500'),
	},
}

const fill = defineRecipe({
	base: ['h-full', rounded.full],
	color: {
		neutral: color.neutral.bg,
		danger: color.danger.bg,
		warning: color.warning.bg,
		success: color.success.bg,
		primary: color.primary.bg,
	},
	defaults: { color: 'neutral' },
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
		base: ['overflow-hidden', rounded.full, ...mode('bg-neutral-200', 'dark:bg-neutral-800')],
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
		bar: {
			fill,
			indeterminate: 'w-1/3 animate-[progress-indeterminate_1.5s_ease-in-out_infinite]',
		},
		gauge: {
			root,
			label,
			track: mode('stroke-neutral-200', 'dark:stroke-neutral-700'),
		},
	},
)

/** Recipe variant props for the {@link Progress} track — its styling axes (`size`), for consumers composing custom slots. */
export type ProgressTrackVariants = VariantProps<typeof k>
export type ProgressBarFillVariants = VariantProps<typeof fill>
/** Recipe variant props for the {@link Progress} gauge root — its styling axes (`size`), for consumers composing custom slots. */
export type ProgressGaugeVariants = VariantProps<typeof root>
