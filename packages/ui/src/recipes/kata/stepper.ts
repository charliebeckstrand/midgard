import { defineRecipe, mode, type VariantProps } from '../../core/recipe'
import { hannou, iro, ji, kasane, kokkaku, narabi, sen } from '../kiso'
import { dan } from '../kiso/dan'

const { cursor, disabled } = hannou
const { text } = iro
const { size, weight, leading } = ji
const { rounded } = kasane
const { flex } = narabi
const { border } = sen

const base = defineRecipe({
	base: 'flex w-full',
	orientation: {
		horizontal: `flex-row items-start ${dan.gap.scale.lg} px-4`,
		vertical: `flex-col items-start ${dan.gap.scale.lg} pe-4 py-4`,
		// Vertical below `sm`, horizontal from it. CSS picks the layout, so the first
		// paint is already correct on a narrow viewport.
		responsive: `flex-col items-start ${dan.gap.scale.lg} pe-4 py-4 sm:flex-row sm:ps-4 sm:py-0`,
	},
	defaults: { orientation: 'horizontal' },
})

const verticalStep = [
	flex.row,
	'w-full',
	`${dan.gap.scale.lg} py-1 first:pt-0`,
	...border.color.subtle,
]

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

// The `li` around an interactive step button. It takes the place of the step in
// the row, so it carries the width bounds and the vertical padding of the step,
// and the button fills it. The button is always the first child of its `li`, so
// the `first:` rule of a vertical step must read the `li`.
const item = defineRecipe({
	base: 'flex',
	orientation: {
		horizontal: 'min-w-20',
		vertical: 'w-full py-1 first:pt-0',
		responsive: 'w-full py-1 first:pt-0 sm:w-auto sm:min-w-20 sm:py-0',
	},
	defaults: { orientation: 'horizontal' },
})

// The negative margins run the rule under the steps on each side, out to their
// indicators. With the `lg` gap of the row on each side, `min-w-20` keeps a gap
// between the boxes of two steps on a narrow row. The gap is 16px at `md`.
const horizontalRule = [
	'-mx-12 mt-2.25 min-w-20',
	flex.fill,
	'self-start',
	'border-t',
	...border.color.default,
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
	base,
	step,
	item: {
		base: item,
		/** The step button inside an `li`. The `li` holds the vertical padding of the step. */
		button: 'py-0',
	},
	title,
	separator,
	content: {
		base: `flex flex-1 flex-col ${dan.gap.scale.xs}`,
		// From `sm`, the column dissolves so the title and description sit in the
		// horizontal step like its direct children.
		responsive: 'sm:contents',
	},
	indicator: {
		base: [
			'relative',
			'size-4.5 shrink-0',
			rounded.full,
			...mode('bg-zinc-400', 'dark:bg-zinc-600'),
		],
		interactive: [
			'group-enabled:group-hover:bg-zinc-500',
			'group-focus-visible:outline-2 group-focus-visible:outline-blue-600',
		],
		active: ['z-10', 'bg-blue-600 dark:bg-blue-600'],
		// A completed step fills green and carries a checkmark, so it does not read
		// as the current step or an upcoming step. The hover step comes after the
		// neutral hover of `interactive`, and the merge keeps it.
		completed: [
			flex.inline,
			'justify-center',
			'bg-green-600 dark:bg-green-600 text-white',
			'group-enabled:group-hover:bg-green-500',
		],
		check: 'size-2.5 stroke-[3.5]',
	},
	description: [size.sm, ...text.muted],
	skeleton: kokkaku.stepper,
} as const

/** Recipe variant props for {@link Stepper} — its styling axes (`orientation`), for consumers composing custom slots. */
export type StepperVariants = Omit<VariantProps<typeof base>, 'orientation'> & {
	/**
	 * The axis of the steps. `responsive` is vertical below the `sm` width and
	 * horizontal from it.
	 * @defaultValue 'horizontal'
	 */
	orientation?: VariantProps<typeof base>['orientation']
}
/** Recipe variant props for {@link StepperStep} — its styling axes (`orientation`), for consumers composing custom slots. */
export type StepperStepVariants = Omit<VariantProps<typeof step>, 'orientation'> & {
	/** The axis of the stepper that holds the step. @defaultValue 'horizontal' */
	orientation?: VariantProps<typeof step>['orientation']
}
/** Recipe variant props for {@link StepperTitle} — its styling axes (`orientation`, `interactive`), for consumers composing custom slots. */
export type StepperTitleVariants = Omit<
	VariantProps<typeof title>,
	'orientation' | 'interactive'
> & {
	/** The axis of the stepper that holds the title. @defaultValue 'horizontal' */
	orientation?: VariantProps<typeof title>['orientation']
	/** Whether the step is a button, so that the title brightens on hover. @defaultValue false */
	interactive?: VariantProps<typeof title>['interactive']
}
/** Recipe variant props for {@link StepperSeparator} — its styling axes (`orientation`), for consumers composing custom slots. */
export type StepperSeparatorVariants = Omit<VariantProps<typeof separator>, 'orientation'> & {
	/** The axis of the stepper that holds the separator. @defaultValue 'horizontal' */
	orientation?: VariantProps<typeof separator>['orientation']
}
