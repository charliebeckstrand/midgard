import { tv, type VariantProps } from 'tailwind-variants'
import { iro } from '../iro'
import { ji } from '../ji'
import { ki } from '../ki'
import { kumi } from '../kumi'
import { maru } from '../maru'
import { yasumi } from '../yasumi'

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
		ki.ring,
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
		ki.ring,
		...yasumi.disabled,
		maru.rounded.lg,
	],
}
