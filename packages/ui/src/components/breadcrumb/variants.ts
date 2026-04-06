import { cva, type VariantProps } from 'class-variance-authority'
import { katachi } from '../../recipes'

const k = katachi.breadcrumb

export const breadcrumbVariants = cva(k.base)

export const breadcrumbListVariants = cva(k.list)

export const breadcrumbItemVariants = cva(k.item.base, {
	variants: { current: k.item.current },
	defaultVariants: k.item.defaults,
})

export type BreadcrumbItemVariants = VariantProps<typeof breadcrumbItemVariants>

export const breadcrumbLinkVariants = cva(k.link.base, {
	variants: { current: k.link.current },
	defaultVariants: k.link.defaults,
})

export type BreadcrumbLinkVariants = VariantProps<typeof breadcrumbLinkVariants>

export const breadcrumbSeparatorVariants = cva(k.separator)
