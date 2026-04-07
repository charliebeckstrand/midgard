import { cva, type VariantProps } from 'class-variance-authority'
import { katachi } from '../../recipes'

const k = katachi.toast

export const toastViewportVariants = cva(k.viewport, {
	variants: {
		position: k.position,
	},
	defaultVariants: {
		position: k.defaults.position,
	},
})

export const toastCardVariants = cva(k.card, {
	variants: {
		type: k.type,
	},
	defaultVariants: {
		type: k.defaults.type,
	},
})

export type ToastViewportVariants = VariantProps<typeof toastViewportVariants>
export type ToastCardVariants = VariantProps<typeof toastCardVariants>
