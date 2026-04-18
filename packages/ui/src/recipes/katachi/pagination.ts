import { tv, type VariantProps } from 'tailwind-variants'
import { ki } from '../ki'
import { kumi } from '../kumi'
import { maru } from '../maru'
import { sawari } from '../sawari'
import { sumi } from '../sumi'
import { take } from '../take'
import { yasumi } from '../yasumi'

export const pagination = tv({ base: ['flex items-center list-none', take.gap.sm] })
export const paginationList = tv({ base: ['flex list-none items-center', take.gap.sm, 'm-0 p-0'] })

export const pageButton = tv({
	base: [
		'inline-flex',
		kumi.center,
		'relative',
		'min-w-9',
		'p-2',
		take.text.sm,
		'font-medium',
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
	base: ['inline-flex', kumi.center, 'min-w-9', take.text.sm, ...sumi.textMuted, 'select-none'],
})

export const slots = {
	nav: [
		'inline-flex',
		kumi.center,
		'p-2',
		take.gap.sm,
		take.text.sm,
		'font-medium',
		...sumi.textMuted,
		...sumi.textHover,
		ki.ring,
		...yasumi.disabled,
		maru.rounded,
		sawari.cursor,
	],
}
