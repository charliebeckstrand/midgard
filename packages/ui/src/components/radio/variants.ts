import { cva } from 'class-variance-authority'
import { radioColors } from '../../recipes/colors'

export const radio = cva(
	[
		'relative isolate flex size-4.75 shrink-0 rounded-full sm:size-4.25',
		'before:absolute before:inset-0 before:-z-10 before:rounded-full before:bg-white before:shadow-sm',
		'group-data-checked:before:bg-(--radio-checked-bg)',
		'dark:before:hidden',
		'dark:bg-white/5 dark:group-data-checked:bg-(--radio-checked-bg)',
		'border border-zinc-950/15 group-data-checked:border-transparent group-hover:group-data-checked:border-transparent group-hover:border-zinc-950/30 group-data-checked:bg-(--radio-checked-border)',
		'dark:border-white/15 dark:group-data-checked:border-white/5 dark:group-hover:group-data-checked:border-white/5 dark:group-hover:border-white/30',
		'after:absolute after:inset-0 after:rounded-full after:shadow-[inset_0_1px_--theme(--color-white/15%)]',
		'dark:after:-inset-px dark:after:hidden dark:after:rounded-full dark:group-data-checked:after:block',
		'[--radio-indicator:transparent] group-data-checked:[--radio-indicator:var(--radio-checked-indicator)] group-hover:group-data-checked:[--radio-indicator:var(--radio-checked-indicator)] group-hover:[--radio-indicator:var(--color-zinc-900)]/10',
		'dark:group-hover:group-data-checked:[--radio-indicator:var(--radio-checked-indicator)] dark:group-hover:[--radio-indicator:var(--color-zinc-700)]',
		'group-focus-visible:outline group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-blue-600',
		'group-disabled:opacity-50',
		'group-disabled:border-zinc-950/25 group-disabled:bg-zinc-950/5 group-disabled:[--radio-checked-indicator:var(--color-zinc-950)]/50 group-disabled:before:bg-transparent',
		'dark:group-disabled:border-white/20 dark:group-disabled:bg-white/2.5 dark:group-disabled:[--radio-checked-indicator:var(--color-white)]/50 dark:group-data-checked:group-disabled:after:hidden',
	],
	{
		variants: {
			color: radioColors,
		},
		defaultVariants: {
			color: 'zinc',
		},
	},
)
