import { defineRecipe, type VariantProps } from '../../core/recipe'
import { hannou, iro, ji, sen } from '../kiso'

const stepper = defineRecipe({
	base: 'flex w-full',
	orientation: {
		horizontal: 'flex-row items-start gap-4 px-4',
		vertical: 'flex-col items-start gap-4 pr-4 py-4',
	},
	defaults: { orientation: 'horizontal' },
})

const step = defineRecipe({
	base: ['group relative text-left', 'outline-none', ...hannou.disabled, ...hannou.cursor],
	orientation: {
		horizontal: 'flex shrink-0 flex-col items-center w-32 gap-0.5 text-center',
		vertical: ['flex w-full items-center gap-4 py-1 first:pt-0', ...sen.borderSubtleColor],
	},
	defaults: { orientation: 'horizontal' },
})

const title = defineRecipe({
	base: ['text-sm font-medium leading-none', 'text-zinc-400', 'dark:text-zinc-600'],
	orientation: {
		horizontal: 'mt-2',
		vertical: '',
	},
	interactive: {
		true: [
			'group-data-[state=current]:text-zinc-950 dark:group-data-[state=current]:text-white',
			'group-enabled:group-hover:group-not-data-[state=current]:text-zinc-500',
		],
		false: '',
	},
	defaults: { orientation: 'horizontal', interactive: false },
})

const separator = defineRecipe({
	base: 'shrink-0',
	orientation: {
		horizontal: ['-mx-12 mt-2 flex-1 self-start', 'border-t', ...sen.borderColor],
		vertical: 'hidden',
	},
	defaults: { orientation: 'horizontal' },
})

export const k = {
	root: stepper,
	step,
	title,
	separator,
	content: 'flex flex-1 flex-col gap-1',
	indicator: {
		base: ['relative', 'size-3.5 shrink-0', 'rounded-full', 'bg-zinc-400', 'dark:bg-zinc-600'],
		interactive: [
			'group-enabled:group-hover:bg-zinc-500',
			'group-focus-visible:outline-2 group-focus-visible:outline-blue-600',
		],
		active: ['z-10', 'bg-blue-600 dark:bg-blue-600'],
	},
	description: [ji.sm, ...iro.text.muted],
}

export type StepperVariants = VariantProps<typeof stepper>
export type StepperStepVariants = VariantProps<typeof step>
export type StepperTitleVariants = VariantProps<typeof title>
export type StepperSeparatorVariants = VariantProps<typeof separator>
