import { tv, type VariantProps } from 'tailwind-variants'
import { sawari } from '../sawari'
import { sumi } from '../sumi'

export const breadcrumb = tv({ base: '' })

export const breadcrumbList = tv({
	base: 'flex flex-wrap items-center gap-1.5 break-words text-sm/5',
})

export const breadcrumbItem = tv({
	base: 'inline-flex items-center gap-1.5',
	variants: {
		current: {
			true: [sumi.text, 'font-normal'],
			false: '',
		},
	},
	defaultVariants: { current: false },
})

export const breadcrumbLink = tv({
	base: '',
	variants: {
		current: {
			true: [sumi.text, 'font-normal'],
			false: [sumi.textMuted, sawari.cursor, 'hover:text-zinc-950', 'dark:hover:text-white'],
		},
	},
	defaultVariants: { current: false },
})

export const breadcrumbSeparator = tv({
	base: [...sumi.textMuted, '[&>svg]:size-3.5'],
})

export type BreadcrumbItemVariants = VariantProps<typeof breadcrumbItem>
export type BreadcrumbLinkVariants = VariantProps<typeof breadcrumbLink>
