import { cva } from 'class-variance-authority'
import { switchColors } from '../../recipes/colors'

export const switchVariants = cva(
	[
		'group relative isolate inline-flex h-6 w-10 cursor-default rounded-full p-[3px] sm:h-5 sm:w-8',
		'transition duration-0 ease-in-out data-changing:duration-200',
		'forced-colors:outline forced-colors:[--switch-bg:Highlight] dark:forced-colors:[--switch-bg:Highlight]',
		'bg-zinc-200 ring-1 ring-black/5 ring-inset dark:bg-white/5 dark:ring-white/15',
		'data-checked:bg-(--switch-bg) data-checked:ring-(--switch-bg-ring) dark:data-checked:bg-(--switch-bg) dark:data-checked:ring-(--switch-bg-ring)',
		'focus:outline-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600',
		'not-disabled:hover:ring-black/15 not-disabled:hover:data-checked:ring-(--switch-bg-ring)',
		'dark:not-disabled:hover:ring-white/25 dark:not-disabled:hover:data-checked:ring-(--switch-bg-ring)',
		'disabled:bg-zinc-200 disabled:opacity-50 disabled:data-checked:bg-zinc-200 disabled:data-checked:ring-black/5',
		'dark:disabled:bg-white/15 dark:disabled:data-checked:bg-white/15 dark:disabled:data-checked:ring-white/15',
	],
	{
		variants: {
			color: switchColors,
		},
		defaultVariants: {
			color: 'zinc',
		},
	},
)
