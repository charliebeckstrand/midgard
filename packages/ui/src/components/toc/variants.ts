import { cva, type VariantProps } from 'class-variance-authority'
import { katachi } from '../../recipes'

const k = katachi.toc

export const tocVariants = cva(k.base)

export const tocListVariants = cva(k.list)

export const tocItemVariants = cva(k.item)

export const tocLinkVariants = cva(k.link.base, {
	variants: { current: k.link.current },
	defaultVariants: k.link.defaults,
})

export type TocLinkVariants = VariantProps<typeof tocLinkVariants>
