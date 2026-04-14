import { cva, type VariantProps } from 'class-variance-authority'
import { katachi } from '../../recipes'

export const k = katachi.stepper

export const stepperVariants = cva(k.base, {
	variants: {
		orientation: k.orientation,
	},
	defaultVariants: k.defaults,
})

export type StepperVariants = VariantProps<typeof stepperVariants>

export const stepperStepVariants = cva(k.step.base, {
	variants: {
		orientation: k.step.orientation,
	},
	defaultVariants: k.defaults,
})

export const stepperTitleVariants = cva(k.title.base, {
	variants: {
		orientation: k.title.orientation,
		interactive: {
			true: k.title.interactive,
			false: '',
		},
	},
	defaultVariants: { ...k.defaults, interactive: false },
})

export const stepperSeparatorVariants = cva(k.separator.base, {
	variants: {
		orientation: k.separator.orientation,
	},
	defaultVariants: k.defaults,
})
