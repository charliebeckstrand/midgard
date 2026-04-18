import { tv, type VariantProps } from 'tailwind-variants'
import { ki } from '../ki'
import { sumi } from '../sumi'
import { take } from '../take'

export const toc = tv({ base: take.text.sm })

export const tocList = tv({
	base: 'relative flex flex-col border-l border-l-zinc-950/10 dark:border-l-white/10',
})

export const tocItem = tv({ base: 'relative' })

export const tocLink = tv({
	base: [
		'z-10',
		'relative block py-1.5 pr-2',
		...sumi.textMuted,
		ki.inset,
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
