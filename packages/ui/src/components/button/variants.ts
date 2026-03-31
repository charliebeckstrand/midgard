import { cva, type VariantProps } from 'class-variance-authority'
import { katachi, ki, nuri, yasumi } from '../../recipes'

export const buttonVariants = cva(
	[
		// Layout
		'relative isolate inline-flex items-center justify-center gap-x-2',
		// Sizing
		'px-[calc(--spacing(3.5)-1px)] py-[calc(--spacing(2.5)-1px)] sm:px-[calc(--spacing(3)-1px)] sm:py-[calc(--spacing(1.5)-1px)] sm:text-sm/6',
		// Shape
		katachi.maru,
		// Font
		'font-semibold',
		// Icon slots
		katachi.icon,
		// Focus
		ki.reset,
		ki.ring,
		// Disabled
		yasumi.base,
		// Cursor
		'cursor-default',
		// Active — scale down instead of color change
		'active:scale-[0.97] transition-transform duration-100',
	],
	{
		variants: {
			variant: {
				solid: [
					// Border
					'border border-transparent',
					// Background via custom property
					'bg-[var(--btn-bg)]',
					// Border pseudo-element
					'before:absolute before:inset-0 before:-z-10 before:rounded-[calc(var(--radius-lg)-1px)]',
					'before:bg-[var(--btn-bg)]',
					'before:shadow-sm',
					// Border overlay
					'border-[var(--btn-border)]',
					// Highlight pseudo-element
					'after:absolute after:inset-0 after:-z-10 after:rounded-[calc(var(--radius-lg)-1px)]',
					'after:shadow-[shadow:inset_0_1px_theme(--color-white/15%)]',
					// Hover
					'hover:before:bg-[var(--btn-hover-overlay)]',
					// Icon color
					'*:data-[slot=icon]:text-[var(--btn-icon)]',
				],
				outline: [
					'border',
					'border-zinc-950/10 dark:border-white/15',
					'text-zinc-950 dark:text-white',
					'bg-transparent hover:bg-zinc-950/2.5 dark:hover:bg-white/5',
					'*:data-[slot=icon]:text-zinc-500 dark:*:data-[slot=icon]:text-zinc-400',
				],
				plain: [
					'border border-transparent',
					'text-zinc-950 dark:text-white',
					'hover:bg-zinc-950/5 dark:hover:bg-white/10',
					'*:data-[slot=icon]:text-zinc-500 dark:*:data-[slot=icon]:text-zinc-400',
				],
				ghost: [
					'border border-transparent',
					'text-zinc-950 dark:text-white',
					'*:data-[slot=icon]:text-zinc-500 dark:*:data-[slot=icon]:text-zinc-400',
				],
			},
			color: {
				zinc: '',
				white: '',
				dark: '',
				red: '',
				amber: '',
				green: '',
				blue: '',
			},
		},
		compoundVariants: [
			{ variant: 'solid', color: 'zinc', className: nuri.button.zinc },
			{ variant: 'solid', color: 'white', className: nuri.button.white },
			{ variant: 'solid', color: 'dark', className: nuri.button.dark },
			{ variant: 'solid', color: 'red', className: nuri.button.red },
			{ variant: 'solid', color: 'amber', className: nuri.button.amber },
			{ variant: 'solid', color: 'green', className: nuri.button.green },
			{ variant: 'solid', color: 'blue', className: nuri.button.blue },
		],
		defaultVariants: {
			variant: 'solid',
			color: 'zinc',
		},
	},
)

export type ButtonVariants = VariantProps<typeof buttonVariants>
