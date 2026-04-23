import { tv, type VariantProps } from 'tailwind-variants'
import { iro } from '../iro'
import { ji } from '../ji'

export const timeline = tv({
	base: ['list-none p-0 m-0'],
	variants: {
		orientation: {
			vertical: 'flex flex-col',
			horizontal: 'flex flex-row overflow-x-auto',
		},
		variant: {
			solid: '',
			outline: '',
		},
	},
	defaultVariants: { orientation: 'vertical', variant: 'solid' },
})

export type TimelineVariants = VariantProps<typeof timeline>

export const slots = {
	item: {
		base: 'relative overflow-hidden',
		vertical: 'grid grid-cols-[0.875rem_1fr] gap-x-4 pb-8 last:pb-0',
		horizontal: 'flex flex-col pl-[6.5px] pt-8 pr-8 last:pr-0',
		active: '',
	},
	marker: {
		base: [
			'z-10 relative inline-flex size-3.5 items-center justify-center',
			// Line segments anchor to the marker and are clipped to the item
			// via overflow-hidden, so adjacent items meet at the shared edge.
			'before:content-[""] before:absolute',
			'after:content-[""] after:absolute',
			// First item has no inbound line; last item has no outbound line.
			'[li:first-child_&]:before:hidden',
			'[li:last-child_&]:after:hidden',
		],
		vertical: [
			'col-start-1 row-start-1 self-center justify-self-center',
			'before:bottom-full before:left-1/2 before:-translate-x-1/2',
			'before:h-[100vh] before:w-0.5 before:bg-zinc-200 dark:before:bg-zinc-700',
			'after:top-full after:left-1/2 after:-translate-x-1/2',
			'after:h-[100vh] after:w-0.5 after:bg-zinc-200 dark:after:bg-zinc-700',
		],
		horizontal: [
			'absolute top-0 left-[6.5px]',
			'before:right-full before:top-1/2 before:-translate-y-1/2',
			'before:h-0.5 before:w-[100vw] before:bg-zinc-200 dark:before:bg-zinc-700',
			'after:left-full after:top-1/2 after:-translate-y-1/2',
			'after:h-0.5 after:w-[100vw] after:bg-zinc-200 dark:after:bg-zinc-700',
		],
		color: {
			zinc: 'text-zinc-500 dark:text-zinc-400',
			red: 'text-red-500 dark:text-red-500',
			amber: 'text-amber-500 dark:text-amber-500',
			green: 'text-green-500 dark:text-green-500',
			blue: 'text-blue-500 dark:text-blue-500',
		},
		lineBefore: {
			zinc: 'before:bg-zinc-200 dark:before:bg-zinc-700',
			red: 'before:bg-red-500 dark:before:bg-red-500',
			amber: 'before:bg-amber-500 dark:before:bg-amber-500',
			green: 'before:bg-green-500 dark:before:bg-green-500',
			blue: 'before:bg-blue-500 dark:before:bg-blue-500',
		},
		lineAfter: {
			zinc: 'after:bg-zinc-200 dark:after:bg-zinc-700',
			red: 'after:bg-red-500 dark:after:bg-red-500',
			amber: 'after:bg-amber-500 dark:after:bg-amber-500',
			green: 'after:bg-green-500 dark:after:bg-green-500',
			blue: 'after:bg-blue-500 dark:after:bg-blue-500',
		},
	},
	heading: {
		base: ['font-semibold', ji.size.lg, ...iro.text.default],
		vertical: 'col-start-2 row-start-1',
		horizontal: 'order-1',
	},
	description: {
		base: ['my-1', ji.size.md],
		vertical: 'col-start-2 row-start-2',
		horizontal: 'order-2',
	},
	timestamp: {
		base: [ji.size.sm, ...iro.text.muted],
		vertical: 'col-start-2 row-start-3 mt-1',
		horizontal: 'order-3 mt-1',
	},
}
