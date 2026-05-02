import { tv, type VariantProps } from 'tailwind-variants'
import { iro } from '../ryu/iro'
import { ji } from '../ryu/ji'
import { sawari } from '../ryu/sawari'
import { sen } from '../ryu/sen'

export const pagination = tv({ base: ['flex items-center list-none', 'gap-xs'] })
export const paginationList = tv({ base: ['flex items-center list-none', 'gap-xs', 'm-0 p-0'] })

export const pageButton = tv({
	base: [
		'relative',
		'inline-flex items-center justify-center',
		'min-w-9',
		'p-2',
		ji.size.sm,
		'font-medium',
		'rounded-lg',
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
	base: [
		'inline-flex items-center justify-center',
		'min-w-9',
		ji.size.sm,
		...iro.text.muted,
		'select-none',
	],
})

export const slots = {
	nav: [
		'inline-flex items-center justify-center',
		'p-2',
		'gap-xs',
		ji.size.sm,
		...iro.text.muted,
		...iro.text.hover,
		'font-medium',
		sen.focus.ring,
		...sawari.disabled,
		...sawari.cursor,
		'rounded-lg',
	],
}
