import { tv, type VariantProps } from 'tailwind-variants'
import { iro, ji, sen } from '../../core/recipe'

export const breadcrumb = tv({ base: '' })

export const breadcrumbList = tv({
	base: ['flex flex-wrap items-center', 'gap-sm', 'break-words', ji.size.md],
})

export const breadcrumbItem = tv({
	base: ['inline-flex items-center', 'gap-sm'],
	variants: {
		current: {
			true: [iro.text.default, 'font-normal'],
			false: '',
		},
	},
	defaultVariants: { current: false },
})

export const breadcrumbLink = tv({
	base: ['rounded-sm', sen.focus.ring],
	variants: {
		current: {
			true: [iro.text.default, 'font-normal'],
			false: [iro.text.muted, 'hover:text-zinc-950', 'dark:hover:text-white'],
		},
	},
	defaultVariants: { current: false },
})

export const breadcrumbSeparator = tv({
	base: [...iro.text.muted, '[&>svg]:size-3.5'],
})

export type BreadcrumbItemVariants = VariantProps<typeof breadcrumbItem>
export type BreadcrumbLinkVariants = VariantProps<typeof breadcrumbLink>

export {
	breadcrumb as breadcrumbVariants,
	breadcrumbItem as breadcrumbItemVariants,
	breadcrumbLink as breadcrumbLinkVariants,
	breadcrumbList as breadcrumbListVariants,
	breadcrumbSeparator as breadcrumbSeparatorVariants,
}
