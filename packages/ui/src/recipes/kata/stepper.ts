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
	},
	defaults: { orientation: 'horizontal' },
})

const step = defineRecipe({
	base: ['group relative text-left', 'outline-none', ...disabled, ...cursor],
	orientation: {
		horizontal: 'flex shrink-0 flex-col items-center w-32 gap-0.5 text-center',
		vertical: [flex.row, 'w-full', 'gap-4 py-1 first:pt-0', ...border.subtleColor],
	},
	defaults: { orientation: 'horizontal' },
})

const title = defineRecipe({
	base: [size.sm, weight.medium, leading.none, ...mode('text-zinc-500', 'dark:text-zinc-400')],
	orientation: {
		horizontal: 'mt-2',
		vertical: '',
	},
	interactive: {
		true: [
			...mode(
				'group-data-[state=current]:text-zinc-950',
				'dark:group-data-[state=current]:text-white',
			),
			// Non-current titles brighten on hover, mirroring the dot. The resting
			// shade stays AA-legible (the dot's dimmer shade would fail text contrast).
			...mode(
				'group-enabled:group-hover:group-not-data-[state=current]:text-zinc-600',
				'dark:group-enabled:group-hover:group-not-data-[state=current]:text-zinc-300',
			),
		],
		false: '',
	},
	defaults: { orientation: 'horizontal', interactive: false },
})

const separator = defineRecipe({
	base: 'shrink-0',
	orientation: {
		horizontal: ['-mx-12 mt-2', flex.fill, 'self-start', 'border-t', ...border.defaultColor],
		vertical: 'hidden',
	},
	defaults: { orientation: 'horizontal' },
})

export const k = {
	root,
	step,
	title,
	separator,
	content: 'flex flex-1 flex-col gap-1',
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
