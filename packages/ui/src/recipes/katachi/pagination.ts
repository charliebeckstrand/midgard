import { tv, type VariantProps } from 'tailwind-variants'
import { ki } from '../ki'
import { kumi } from '../kumi'
import { maru } from '../maru'
import { sawari } from '../sawari'
import { sumi } from '../sumi'
import { yasumi } from '../yasumi'

export const pagination = tv({ base: 'flex list-none gap-1' })
export const paginationList = tv({ base: 'flex list-none items-center gap-1 m-0 p-0' })

export const pageButton = tv({
	base: [
		'inline-flex',
		kumi.center,
		'relative',
		'min-w-9',
		'px-2 py-1.5',
		'text-sm/6 font-medium',
		ki.ring,
		maru.rounded,
		sawari.cursor,
	],
	variants: {
		current: {
			true: [...sumi.text],
			false: [...sumi.textMuted, ...sumi.textHover],
		},
	},
	defaultVariants: { current: false },
})

export type PageButtonVariants = VariantProps<typeof pageButton>

export const paginationGap = tv({
	base: ['inline-flex', kumi.center, 'min-w-9', 'text-sm/6', ...sumi.textMuted, 'select-none'],
})

export const slots = {
	nav: [
		'inline-flex',
		kumi.center,
		'gap-1 px-2 py-1.5',
		'text-sm/6 font-medium',
		...sumi.textMuted,
		...sumi.textHover,
		ki.ring,
		...yasumi.disabled,
		maru.rounded,
		sawari.cursor,
	],
}
