import { cva } from 'class-variance-authority'
import { katachi } from '../../recipes'

const k = katachi.tooltip

export const tooltipTriggerVariants = cva(k.trigger)

export const tooltipContentVariants = cva(k.content, {
	variants: {
		placement: k.anchor,
	},
	defaultVariants: {
		placement: 'top',
	},
})
