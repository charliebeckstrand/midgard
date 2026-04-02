import { cva, type VariantProps } from 'class-variance-authority'
import { ki, maru, sumi } from '../../recipes'

export const paginationVariants = cva('flex list-none gap-1')

export const paginationListVariants = cva('flex list-none items-center gap-1 m-0 p-0')

export const pageButtonVariants = cva(
	[
		ki.ring,
		maru.rounded,
		'relative inline-flex min-w-9 items-center justify-center px-2 py-1.5 text-sm/6 font-medium',
		'cursor-default',
		'before:absolute before:inset-px before:rounded-[calc(var(--radius-lg)-1px)]',
	],
	{
		variants: {
			current: {
				true: [sumi.base, 'before:bg-zinc-950/5 dark:before:bg-white/10'],
				false: [sumi.muted, 'hover:text-zinc-950 dark:hover:text-white'],
			},
		},
		defaultVariants: {
			current: false,
		},
	},
)

export type PageButtonVariants = VariantProps<typeof pageButtonVariants>

export const paginationGapVariants = cva([
	sumi.muted,
	'inline-flex min-w-9 items-center justify-center text-sm/6',
	'select-none',
])

export const paginationNavVariants = cva([
	ki.ring,
	sumi.muted,
	maru.rounded,
	'inline-flex items-center justify-center gap-1 px-2 py-1.5 text-sm/6 font-medium',
	'hover:text-zinc-950 dark:hover:text-white',
	'cursor-default',
	'disabled:opacity-50',
])
