import { tv, type VariantProps } from 'tailwind-variants'
import { sawari } from '../sawari'
import { sumi } from '../sumi'
import { take } from '../take'

export const breadcrumb = tv({ base: '' })

export const breadcrumbList = tv({
	base: ['flex flex-wrap items-center', take.gap.md, 'break-words', take.text.sm],
})

export const breadcrumbItem = tv({
	base: ['inline-flex items-center', take.gap.md],
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
