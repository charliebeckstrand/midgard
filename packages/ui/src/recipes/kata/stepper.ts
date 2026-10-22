/**
 * Stepper kata: the unit of the `<Stepper>` family. The root slot `base` is the
 * row of steps. `step` is a step, `item` is the `li` around a step button, and
 * `button` is that button. `title`, `separator`, and `content` are the other
 * parts of a step. `indicator` is the marker of a step, and `fill`, `glyph`, and
 * `check` are the parts in it. The `skeleton` form is an extra.
 *
 * `orientation` is a responsive axis of the row and of each part that changes
 * with it. Each value of an orientation table writes the same properties, so a
 * breakpoint replaces each one. The classes that both orientations share are in
 * the base of the part. Tailwind scans whole class literals, and
 * `ui/tailwind.css` lists each prefixed form in an `@source inline(...)` line.
 *
 * `interactive` is true when the steps are buttons.
 */
import { defineKata, mode, type VariantProps } from '../../core/recipe'
import { dan, hannou, iro, ji, kasane, kokkaku, narabi, sen } from '../kiso'

const { cursor, disabled } = hannou
const { text } = iro
const { size, weight, leading } = ji
const { rounded } = kasane
const { flex } = narabi
const { border } = sen

export const k = defineKata(
	{
		base: `flex w-full items-start ${dan.gap.scale.lg} pe-4`,
		responsive: {
			orientation: {
				horizontal: 'flex-row ps-4 py-0',
				vertical: 'flex-col ps-0 py-4',
			},
		},
		slots: {
			/**
			 * A horizontal step is `w-32` where the row has the space, and shrinks to
			 * `min-w-20` where it does not, so that a narrow row does not overlap its
			 * steps. Its title and description then wrap in the narrower column. The
			 * gap of a horizontal step keeps one size at each density step.
			 */
			step: {
				base: [
					'group relative flex items-center first:pt-0',
					'outline-none',
					...disabled,
					...cursor,
					...border.color.subtle,
					dan.gap.stepper,
				],
				responsive: {
					orientation: {
						horizontal: 'flex-col min-w-20 w-32 gap-0.5 py-0 text-center',
						vertical: 'flex-row min-w-auto w-full gap-(--ui-stepper-gap) py-1 text-start',
					},
				},
			},
			/**
			 * The `li` around an interactive step button. It takes the place of the step
			 * in the row, so it carries the width bounds and the vertical padding of the
			 * step, and the button fills it. The button is always the first child of its
			 * `li`, so the `first:` rule of a vertical step must read the `li`.
			 */
			item: {
				base: 'flex first:pt-0',
				responsive: {
					orientation: {
						horizontal: 'min-w-20 w-auto py-0',
						vertical: 'min-w-auto w-full py-1',
					},
				},
			},
			/** The step button inside an `li`. The `li` holds the vertical padding of the step. */
			button: 'py-0',
			title: {
				base: [size.sm, weight.medium, leading.none, ...text.muted],
				interactive: {
					true: [
						...mode(
							'group-data-[state=current]:text-zinc-950',
							'dark:group-data-[state=current]:text-white',
						),
						// Brightens on hover like the dot, but from a more legible resting
						// shade: the dot's dim shade would fail AA contrast as text.
						...mode(
							'group-enabled:group-hover:group-not-data-[state=current]:text-zinc-600',
							'dark:group-enabled:group-hover:group-not-data-[state=current]:text-zinc-300',
						),
					],
					false: '',
				},
				responsive: { orientation: { horizontal: 'mt-2', vertical: 'mt-0' } },
			},
			/**
			 * The negative margins run the rule under the steps on each side, out to
			 * their indicators. With the `lg` gap of the row on each side, `min-w-20`
			 * keeps a gap between the boxes of two steps on a narrow row. The gap is 16px
			 * at `md`. A vertical row has no rule.
			 */
			separator: {
				base: [
					'shrink-0 -mx-12 mt-2.25 min-w-20',
					flex.fill,
					'self-start border-t',
					...border.color.default,
				],
				responsive: { orientation: { horizontal: 'block', vertical: 'hidden' } },
			},
			/**
			 * The column of the title and the description beside the indicator of a
			 * vertical step. In a horizontal step the column dissolves, so the title and
			 * the description sit in the step like its direct children.
			 */
			content: {
				base: `flex-1 flex-col ${dan.gap.scale.xs}`,
				responsive: { orientation: { horizontal: 'contents', vertical: 'flex' } },
			},
			/**
			 * The marker of a step. It reads the `data-state` of its step: a completed
			 * step fills green, so it does not read as the current step or an upcoming
			 * step, and the current step paints its content in white on the blue fill.
			 */
			indicator: [
				'relative',
				flex.inline,
				'justify-center',
				'size-4.5 shrink-0',
				rounded.full,
				...mode('bg-zinc-400', 'dark:bg-zinc-600'),
				// The hover and the focus of a step button. A display-only step is an
				// `li`, which is never enabled or focused, so these do not match there.
				'group-enabled:group-hover:bg-zinc-500',
				'group-focus-visible:outline-2 group-focus-visible:outline-blue-600',
				// The state of the step (`data-state`). Each state class has one more
				// variant than the class that it overrides, so it wins by specificity.
				...mode(
					'group-data-[state=completed]:bg-green-600',
					'dark:group-data-[state=completed]:bg-green-600',
				),
				'group-data-[state=completed]:text-white',
				'group-enabled:group-hover:group-data-[state=completed]:bg-green-500',
				'group-data-[state=current]:text-white',
			],
			/** The blue fill of the current step. */
			fill: ['z-10', 'bg-blue-600 dark:bg-blue-600'],
			/**
			 * The content of the indicator, a number or a glyph. It comes after the fill
			 * in the DOM at the same `z-10`, so it paints above the fill.
			 */
			glyph: 'relative z-10 inline-flex',
			/** The checkmark of a completed step. */
			check: 'size-2.5 stroke-[3.5]',
			description: [size.sm, ...text.muted],
		},
		defaults: { interactive: false },
	},
	{ skeleton: kokkaku.stepper },
)

/** Recipe variant props for {@link StepperTitle}: its `interactive` axis, for consumers composing custom slots. */
export type StepperTitleVariants = {
	/** Whether the step is a button, so that the title brightens on hover. @defaultValue false */
	interactive?: VariantProps<typeof k>['interactive']
}
