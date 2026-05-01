import { tv, type VariantProps } from 'tailwind-variants'
import { iro } from '../ryu/iro'
import { ji } from '../ryu/ji'
import { kumi } from '../ryu/kumi'
import { maru } from '../ryu/maru'
import { sawari } from '../ryu/sawari'
import { sen } from '../ryu/sen'

export const pagination = tv({ base: ['flex items-center list-none', kumi.gap.sm] })
export const paginationList = tv({ base: ['flex list-none items-center', kumi.gap.sm, 'm-0 p-0'] })

export const pageButton = tv({
	base: [
		'inline-flex',
		kumi.center,
		'relative',
		'min-w-9',
		'p-2',
		ji.size.sm,
		'font-medium',
		maru.rounded.lg,
		sen.focus.ring,
	],
	variants: {
		current: {
			true: [...iro.text.default],
			false: [...iro.text.muted, ...iro.text.hover],
		},
	},
	defaultVariants: { current: false },
})

export type PageButtonVariants = VariantProps<typeof pageButton>

export const paginationGap = tv({
	base: ['inline-flex', kumi.center, 'min-w-9', ji.size.sm, ...iro.text.muted, 'select-none'],
})

export const slots = {
	nav: [
		'inline-flex',
		kumi.center,
		'p-2',
		kumi.gap.sm,
		ji.size.sm,
		'font-medium',
		...iro.text.muted,
		...iro.text.hover,
		sen.focus.ring,
		...sawari.disabled,
		...sawari.cursor,
		maru.rounded.lg,
	],
}
