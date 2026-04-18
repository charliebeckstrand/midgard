import { tv, type VariantProps } from 'tailwind-variants'
import { ki } from '../ki'
import { sumi } from '../sumi'

export const toc = tv({ base: 'text-sm/5' })

export const tocList = tv({
	base: 'relative flex flex-col border-l border-l-zinc-950/10 dark:border-l-white/10',
})

export const tocItem = tv({ base: 'relative' })

export const tocLink = tv({
	base: [
		'relative z-10 block py-1.5 pr-2',
		ki.inset,
		...sumi.textMuted,
		'hover:not-data-current:text-zinc-950 dark:hover:not-data-current:text-white',
	],
	variants: {
		current: {
			true: [...sumi.text],
			false: '',
		},
	},
	defaultVariants: { current: false },
})

export type TocLinkVariants = VariantProps<typeof tocLink>

export const slots = {
	activeIndicator: 'bg-zinc-950 dark:bg-white',
}
