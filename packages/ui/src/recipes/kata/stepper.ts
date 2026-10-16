import { defineRecipe, mode, type VariantProps } from '../../core/recipe'
import { hannou, iro, ji, kasane, kokkaku, narabi, sen } from '../kiso'
import { dan } from '../kiso/dan'

const { cursor, disabled } = hannou
const { text } = iro
const { size, weight, leading } = ji
const { rounded } = kasane
const { flex } = narabi
const { border } = sen

/*
 * Each part of the stepper has its classes for both orientations, and
 * `resolveVariant` gives the classes of the value at each breakpoint. Each value
 * of an orientation table writes the same properties, so a breakpoint replaces
 * each one. The classes that both orientations share are in the base of the
 * part. Tailwind scans whole class literals, and `ui/tailwind.css` lists each
 * prefixed form in an `@source inline(...)` line.
 */

const base = {
	base: `flex w-full items-start ${dan.gap.scale.lg} pe-4`,
	orientation: {
		horizontal: 'flex-row ps-4 py-0',
		vertical: 'flex-col ps-0 py-4',
	},
} as const

// A horizontal step is `w-32` where the row has the space, and shrinks to
// `min-w-20` where it does not, so that a narrow row does not overlap its steps.
// Its title and description then wrap in the narrower column. The gap of a
// horizontal step keeps one size at each density step.
const step = {
	base: [
		'group relative flex first:pt-0',
		'outline-none',
		...disabled,
		...cursor,
		...border.color.subtle,
		dan.gap.stepper,
	],
	orientation: {
		horizontal: 'flex-col items-center min-w-20 w-32 gap-0.5 py-0 text-center',
		vertical: 'flex-row items-center min-w-auto w-full gap-(--ui-stepper-gap) py-1 text-start',
	},
} as const

const title = defineRecipe({
	base: [size.sm, weight.medium, leading.none, ...mode('text-zinc-500', 'dark:text-zinc-400')],
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
	defaults: { interactive: false },
})

// The `li` around an interactive step button. It takes the place of the step in
// the row, so it carries the width bounds and the vertical padding of the step,
// and the button fills it. The button is always the first child of its `li`, so
// the `first:` rule of a vertical step must read the `li`.
const item = {
	base: 'flex first:pt-0',
	orientation: {
		horizontal: 'min-w-20 w-auto py-0',
		vertical: 'min-w-auto w-full py-1',
	},
} as const

// The negative margins run the rule under the steps on each side, out to their
// indicators. With the `lg` gap of the row on each side, `min-w-20` keeps a gap
// between the boxes of two steps on a narrow row. The gap is 16px at `md`. A
// vertical row has no rule.
const separator = {
	base: [
		'shrink-0 -mx-12 mt-2.25 min-w-20',
		flex.fill,
		'self-start border-t',
		...border.color.default,
	],
	orientation: {
		horizontal: 'block',
		vertical: 'hidden',
	},
} as const

export const k = {
	base,
	step,
	item: {
		...item,
		/** The step button inside an `li`. The `li` holds the vertical padding of the step. */
		button: 'py-0',
	},
	title: {
		base: title,
		orientation: {
			horizontal: 'mt-2',
			vertical: 'mt-0',
		},
	},
	separator,
	// The column of the title and the description beside the indicator of a
	// vertical step. In a horizontal step the column dissolves, so the title and
	// the description sit in the step like its direct children.
	content: {
		base: `flex-1 flex-col ${dan.gap.scale.xs}`,
		orientation: {
			horizontal: 'contents',
			vertical: 'flex',
		},
	},
	indicator: {
		base: [
			'relative',
			flex.inline,
			'justify-center',
			'size-4.5 shrink-0',
			rounded.full,
			...mode('bg-zinc-400', 'dark:bg-zinc-600'),
		],
		interactive: [
			'group-enabled:group-hover:bg-zinc-500',
			'group-focus-visible:outline-2 group-focus-visible:outline-blue-600',
		],
		active: ['z-10', 'bg-blue-600 dark:bg-blue-600'],
		// The current step paints its content in white on the blue fill.
		current: 'text-white',
		// The content of the indicator, a number or a glyph. It comes after the fill
		// in the DOM at the same `z-10`, so it paints above the fill.
		content: 'relative z-10 inline-flex',
		// A completed step fills green and carries a checkmark, so it does not read
		// as the current step or an upcoming step. The hover step comes after the
		// neutral hover of `interactive`, and the merge keeps it.
		completed: [
			'bg-green-600 dark:bg-green-600 text-white',
			'group-enabled:group-hover:bg-green-500',
		],
		check: 'size-2.5 stroke-[3.5]',
	},
	description: [size.sm, ...text.muted],
	skeleton: kokkaku.stepper,
} as const

/** Recipe variant props for {@link StepperTitle}: its `interactive` axis, for consumers composing custom slots. */
export type StepperTitleVariants = Omit<VariantProps<typeof title>, 'interactive'> & {
	/** Whether the step is a button, so that the title brightens on hover. @defaultValue false */
	interactive?: VariantProps<typeof title>['interactive']
}
