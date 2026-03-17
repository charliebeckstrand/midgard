import { cva } from 'class-variance-authority'
import { buttonColors } from '../../recipes/colors'
import { iconSlot, iconSlotIconOnly } from '../../recipes/icon'

export const button = cva(
	[
		// Layout
		'relative isolate inline-flex w-fit items-center justify-center gap-x-2 rounded-lg text-base/6 font-semibold select-none',
		// Icon slots — sizing from shared recipe, button-specific spacing + color
		...iconSlot,
		'*:data-[slot=icon]:-mx-0.5 *:data-[slot=icon]:my-0.5 *:data-[slot=icon]:self-center *:data-[slot=icon]:text-(--btn-icon) sm:*:data-[slot=icon]:my-1',
		// Icon-only — square aspect, centered, no gap
		'data-icon-only:gap-0',
		...iconSlotIconOnly,
		// Focus
		'focus:outline-hidden',
		'focus-visible:outline-1 focus-visible:-outline-offset-1 focus-visible:outline-blue-600',
		// Disabled
		'disabled:opacity-50',
		// Forced colors
		'forced-colors:[--btn-icon:ButtonText]',
		'forced-colors:hover:[--btn-icon:ButtonText]',
	],
	{
		variants: {
			variant: {
				solid: [
					// Layout + sizing
					'items-baseline border px-[calc(--spacing(3.5)-1px)] py-[calc(--spacing(2.5)-1px)] sm:px-[calc(--spacing(3)-1px)] sm:py-[calc(--spacing(1.5)-1px)]',
					// Icon-only — square padding
					'data-icon-only:items-center data-icon-only:p-[calc(--spacing(2.5)-1px)] sm:data-icon-only:p-[calc(--spacing(1.5)-1px)]',
					// Light — border and before pseudo (visual bg)
					'border-transparent bg-(--btn-border)',
					'before:absolute before:inset-0 before:-z-10 before:rounded-[calc(var(--radius-lg)-1px)] before:bg-(--btn-bg)',
					'before:shadow-sm',
					// Light — after pseudo (inset highlight)
					'after:absolute after:inset-0 after:-z-10 after:rounded-[calc(var(--radius-lg)-1px)]',
					'after:shadow-[inset_0_1px_--theme(--color-white/15%)]',
					// Hover + Active
					'active:after:bg-(--btn-hover-overlay)',
					'not-disabled:hover:after:bg-(--btn-hover-overlay)',
					// Disabled
					'disabled:before:shadow-none disabled:after:shadow-none',
					// Dark
					'dark:bg-(--btn-bg)',
					'dark:border-white/5',
					'dark:before:hidden',
					'dark:after:-inset-px dark:after:rounded-lg',
				],
				outline: [
					// Layout + sizing
					'items-baseline border px-[calc(--spacing(3.5)-1px)] py-[calc(--spacing(2.5)-1px)] sm:px-[calc(--spacing(3)-1px)] sm:py-[calc(--spacing(1.5)-1px)]',
					// Icon-only — square padding
					'data-icon-only:items-center data-icon-only:p-[calc(--spacing(2.5)-1px)] sm:data-icon-only:p-[calc(--spacing(1.5)-1px)]',
					// Light
					'border-zinc-950/10 text-zinc-950',
					'[--btn-icon:var(--color-zinc-500)]',
					// Hover + Active
					'active:bg-zinc-950/2.5 active:[--btn-icon:var(--color-zinc-700)]',
					'not-disabled:hover:bg-zinc-950/2.5',
					'hover:[--btn-icon:var(--color-zinc-700)]',
					// Dark
					'dark:border-white/15 dark:text-white dark:[--btn-bg:transparent]',
					'dark:active:bg-white/5 dark:active:[--btn-icon:var(--color-zinc-400)]',
					'dark:not-disabled:hover:bg-white/5',
					'dark:hover:[--btn-icon:var(--color-zinc-400)]',
				],
				plain: [
					// Layout + sizing
					'items-baseline border border-transparent px-[calc(--spacing(3.5)-1px)] py-[calc(--spacing(2.5)-1px)] sm:px-[calc(--spacing(3)-1px)] sm:py-[calc(--spacing(1.5)-1px)]',
					// Icon-only — square padding
					'data-icon-only:items-center data-icon-only:p-[calc(--spacing(2.5)-1px)] sm:data-icon-only:p-[calc(--spacing(1.5)-1px)]',
					// Light
					'text-zinc-950',
					'[--btn-icon:var(--color-zinc-500)]',
					// Hover + Active
					'active:bg-zinc-950/5 active:[--btn-icon:var(--color-zinc-700)]',
					'not-disabled:hover:bg-zinc-950/5',
					'hover:[--btn-icon:var(--color-zinc-700)]',
					// Dark
					'dark:text-white',
					'dark:[--btn-icon:var(--color-zinc-500)]',
					'dark:active:bg-white/10 dark:active:[--btn-icon:var(--color-zinc-400)]',
					'dark:not-disabled:hover:bg-white/10',
					'dark:hover:[--btn-icon:var(--color-zinc-400)]',
				],
				ghost: [
					// Light
					'text-zinc-950',
					'[--btn-icon:var(--color-zinc-500)]',
					// Dark
					'dark:text-white',
					'dark:[--btn-icon:var(--color-zinc-400)]',
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
			{ variant: 'solid', color: 'zinc', class: buttonColors.zinc },
			{ variant: 'solid', color: 'white', class: buttonColors.white },
			{ variant: 'solid', color: 'dark', class: buttonColors.dark },
			{ variant: 'solid', color: 'red', class: buttonColors.red },
			{ variant: 'solid', color: 'amber', class: buttonColors.amber },
			{ variant: 'solid', color: 'green', class: buttonColors.green },
			{ variant: 'solid', color: 'blue', class: buttonColors.blue },
		],
		defaultVariants: {
			variant: 'solid',
			color: 'zinc',
		},
	},
)
