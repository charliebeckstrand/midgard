import { cva, type VariantProps } from 'class-variance-authority'
import { katachi } from '../../recipes'

const k = katachi.pagination

export const paginationVariants = cva(k.base)

export const paginationListVariants = cva(k.list)

export const pageButtonVariants = cva(k.page.base, {
	variants: { current: k.page.current },
	defaultVariants: k.page.defaults,
})

export type PageButtonVariants = VariantProps<typeof pageButtonVariants>

export const paginationGapVariants = cva(k.gap)
