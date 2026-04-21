import { tv, type VariantProps } from 'tailwind-variants'
import { iro } from '../iro'
import { ji } from '../ji'
import { kumi } from '../kumi'
import { sawari } from '../sawari'

export const breadcrumb = tv({ base: '' })

export const breadcrumbList = tv({
	base: ['flex flex-wrap items-center', kumi.gap.md, 'break-words', ji.size.md],
})

export const breadcrumbItem = tv({
	base: ['inline-flex items-center', kumi.gap.md],
	variants: {
		current: {
			true: [iro.text.default, 'font-normal'],
			false: '',
		},
	},
	defaultVariants: { current: false },
})

export const breadcrumbLink = tv({
	base: '',
	variants: {
		current: {
			true: [iro.text.default, 'font-normal'],
			false: [iro.text.muted, sawari.cursor, 'hover:text-zinc-950', 'dark:hover:text-white'],
		},
	},
	defaultVariants: { current: false },
})

export const breadcrumbSeparator = tv({
	base: [...iro.text.muted, '[&>svg]:size-3.5'],
})

export type BreadcrumbItemVariants = VariantProps<typeof breadcrumbItem>
export type BreadcrumbLinkVariants = VariantProps<typeof breadcrumbLink>
