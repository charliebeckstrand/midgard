import { cva, type VariantProps } from 'class-variance-authority'
import { katachi } from '../../recipes'

const k = katachi.fileUpload

export const fileUploadVariants = cva(k.dropzone, {
	variants: {
		size: k.size,
	},
	defaultVariants: k.defaults,
})

export type FileUploadVariants = VariantProps<typeof fileUploadVariants>
