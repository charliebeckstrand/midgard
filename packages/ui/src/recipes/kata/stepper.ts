import { defineRecipe, mode, type VariantProps } from '../../core/recipe'
import { hannou, iro, ji, kasane, kokkaku, narabi, sen } from '../kiso'

const { cursor, disabled } = hannou
const { text } = iro
const { size, weight, leading } = ji
const { rounded } = kasane
const { flex } = narabi
const { border } = sen

const root = defineRecipe({
	base: 'flex w-full',
	orientation: {
		horizontal: 'flex-row items-start gap-4 px-4',
		vertical: 'flex-col items-start gap-4 pr-4 py-4',
		// Vertical below `sm`, horizontal from it. CSS picks the layout, so the first
		// paint is already correct on a narrow viewport.
		responsive: 'flex-col items-start gap-4 pr-4 py-4 sm:flex-row sm:pl-4 sm:py-0',
	},
	defaults: { orientation: 'horizontal' },
})

const verticalStep = [flex.row, 'w-full', 'gap-4 py-1 first:pt-0', ...border.subtleColor]

// A horizontal step is `w-32` where the row has the space, and shrinks to
// `min-w-20` where it does not, so that a narrow row does not overlap its steps.
// Its title and description then wrap in the narrower column.
const step = defineRecipe({
	base: ['group relative text-start', 'outline-none', ...disabled, ...cursor],
	orientation: {
		horizontal: 'flex min-w-20 flex-col items-center w-32 gap-0.5 text-center',
		vertical: verticalStep,
		responsive: [
			...verticalStep,
			'sm:min-w-20 sm:flex-col sm:w-32 sm:gap-0.5 sm:py-0 sm:text-center',
		],
	},
	defaults: { orientation: 'horizontal' },
})

const title = defineRecipe({
	base: [size.sm, weight.medium, leading.none, ...mode('text-zinc-500', 'dark:text-zinc-400')],
	orientation: {
		horizontal: 'mt-2',
		vertical: '',
		responsive: 'sm:mt-2',
	},
	interactive: {
		true: [
			...mode(
				'group-data-[state=current]:text-zinc-950',
				'dark:group-data-[state=current]:text-white',
			),
			// Brightens on hover like the dot, but from a more legible resting
			// shade — the dot's dim shade would fail AA contrast as text.
			...mode(
				'group-enabled:group-hover:group-not-data-[state=current]:text-zinc-600',
				'dark:group-enabled:group-hover:group-not-data-[state=current]:text-zinc-300',
			),
		],
		false: '',
	},
	defaults: { orientation: 'horizontal', interactive: false },
})

// The negative margins run the rule under the steps on each side, out to their
// indicators. With the `gap-4` of the row on each side, `min-w-20` keeps a gap of
// 16px between the boxes of two steps on a narrow row.
const horizontalRule = [
	'-mx-12 mt-2 min-w-20',
	flex.fill,
	'self-start',
	'border-t',
	...border.defaultColor,
]

const separator = defineRecipe({
	base: 'shrink-0',
	orientation: {
		horizontal: horizontalRule,
		vertical: 'hidden',
		responsive: ['max-sm:hidden', ...horizontalRule],
	},
	defaults: { orientation: 'horizontal' },
})

export const k = {
	root,
	step,
	title,
	separator,
	content: {
		base: 'flex flex-1 flex-col gap-1',
		// From `sm`, the column dissolves so the title and description sit in the
		// horizontal step like its direct children.
		responsive: 'sm:contents',
	},
	indicator: {
		base: [
			'relative',
			'size-3.5 shrink-0',
			rounded.full,
			...mode('bg-zinc-400', 'dark:bg-zinc-600'),
		],
		interactive: [
			'group-enabled:group-hover:bg-zinc-500',
			'group-focus-visible:outline-2 group-focus-visible:outline-blue-600',
		],
		active: ['z-10', 'bg-blue-600 dark:bg-blue-600'],
		// A completed step fills in the hue of the current step and carries a
		// checkmark, so it does not read as an upcoming step. The hover step comes
		// after the neutral hover of `interactive`, and the merge keeps it.
		completed: [
			flex.inline,
			'items-center justify-center',
			'bg-blue-600 dark:bg-blue-600 text-white',
			'group-enabled:group-hover:bg-blue-500',
		],
		check: 'size-2.5 stroke-[3.5]',
	},
	description: [size.sm, ...text.muted],
	skeleton: kokkaku.stepper,
} as const

/** Recipe variant props for {@link Stepper} — its styling axes (`orientation`), for consumers composing custom slots. */
export type StepperVariants = VariantProps<typeof root>
/** Recipe variant props for {@link StepperStep} — its styling axes (`orientation`), for consumers composing custom slots. */
export type StepperStepVariants = VariantProps<typeof step>
/** Recipe variant props for {@link StepperTitle} — its styling axes (`orientation`, `interactive`), for consumers composing custom slots. */
export type StepperTitleVariants = VariantProps<typeof title>
/** Recipe variant props for {@link StepperSeparator} — its styling axes (`orientation`), for consumers composing custom slots. */
export type StepperSeparatorVariants = VariantProps<typeof separator>
