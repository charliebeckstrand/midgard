import { kage } from '../kage'
import { maru } from '../maru'
import { nagare } from '../nagare'
import { take } from '../take'

export const scrollArea = {
	wrapper: {
		base: ['group relative overflow-hidden'],
		bare: {
			true: '',
			false: kage.border,
		},
	},
	viewport: {
		base: ['[scrollbar-width:none]', '[&::-webkit-scrollbar]:hidden'],
		bare: {
			true: '',
			false: 'p-4',
		},
		orientation: {
			vertical: 'h-full overflow-x-hidden overflow-y-auto',
			horizontal: 'w-full overflow-x-auto overflow-y-hidden',
			both: 'size-full overflow-auto',
		},
		size: take.scrollArea,
		defaults: {
			orientation: 'vertical' as const,
			bare: false as const,
		},
	},
	scrollbar: {
		base: ['absolute touch-none select-none', nagare.opacity],
		orientation: {
			vertical: 'right-0 w-1.5',
			horizontal: 'bottom-0 h-1.5',
		},
		rounded: {
			true: '',
			false: '',
		},
		state: {
			auto: 'opacity-0 group-hover:opacity-100',
			active: 'opacity-100',
		},
		compoundVariants: [
			{ orientation: 'vertical' as const, rounded: true, class: 'top-2 bottom-2' },
			{ orientation: 'vertical' as const, rounded: false, class: 'top-0 bottom-0' },
			{ orientation: 'horizontal' as const, rounded: true, class: 'right-2 left-2' },
			{ orientation: 'horizontal' as const, rounded: false, class: 'right-0 left-0' },
		],
	},
	thumb: {
		base: [
			'absolute rounded-full',
			'bg-zinc-950/20 hover:bg-zinc-950/30 active:bg-zinc-950/40',
			'dark:bg-white/20 dark:hover:bg-white/30 dark:active:bg-white/40',
		],
		orientation: {
			vertical: 'w-full',
			horizontal: 'h-full',
		},
	},
	rounded: {
		true: maru.rounded,
		false: '',
	},
	defaults: {
		rounded: false as const,
		bare: false as const,
	},
}
