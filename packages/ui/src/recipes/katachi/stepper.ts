import { tv, type VariantProps } from 'tailwind-variants'
import { iro } from '../iro'
import { ji } from '../ji'
import { maru } from '../maru'
import { sen } from '../sen'
import { yasumi } from '../yasumi'

export const stepper = tv({
	base: 'flex w-full',
	variants: {
		orientation: {
			horizontal: 'flex-row items-start gap-4 px-4',
			vertical: 'flex-col items-start gap-4 pr-4 py-4',
		},
	},
	defaultVariants: { orientation: 'horizontal' },
})

export const stepperStep = tv({
	base: ['group relative text-left', 'outline-none', ...yasumi.disabled],
	variants: {
		orientation: {
			horizontal: 'flex shrink-0 flex-col items-center w-32 gap-0.5 text-center',
			vertical: ['flex w-full items-center gap-4 py-1 first:pt-0', ...sen.borderSubtleColor],
		},
	},
	defaultVariants: { orientation: 'horizontal' },
})

export const stepperTitle = tv({
	base: ['text-sm font-medium leading-none', 'text-zinc-400', 'dark:text-zinc-600'],
	variants: {
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
	},
	defaultVariants: { orientation: 'horizontal', interactive: false },
})

export const stepperSeparator = tv({
	base: 'shrink-0',
	variants: {
		orientation: {
			horizontal: ['-mx-12 mt-2 flex-1 self-start', 'border-t', ...sen.borderColor],
			vertical: 'hidden',
		},
	},
	defaultVariants: { orientation: 'horizontal' },
})

export type StepperVariants = VariantProps<typeof stepper>
export type StepperStepVariants = VariantProps<typeof stepperStep>
export type StepperTitleVariants = VariantProps<typeof stepperTitle>
export type StepperSeparatorVariants = VariantProps<typeof stepperSeparator>

export const slots = {
	content: 'flex flex-1 flex-col gap-1',
	indicator: {
		base: ['relative', 'size-3.5 shrink-0', maru.roundedFull, 'bg-zinc-400', 'dark:bg-zinc-600'],
		interactive: [
			'group-enabled:group-hover:bg-zinc-500',
			'group-focus-visible:outline-2 group-focus-visible:outline-blue-600',
		],
	},
	description: [ji.size.sm, ...iro.text.muted],
	activeIndicator: ['z-10', 'bg-blue-600 dark:bg-blue-600'],
}
