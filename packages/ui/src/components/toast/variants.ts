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

export type ToastViewportVariants = VariantProps<typeof toastViewportVariants>
