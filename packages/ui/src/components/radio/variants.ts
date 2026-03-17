import { cva } from 'class-variance-authority'
import { nuri } from '../../recipes'

export const radio = cva(
	[
		// Layout
		'relative isolate flex size-4.75 shrink-0 rounded-full sm:size-4.25',
		// Light — before pseudo (visual bg/shadow)
		'before:absolute before:inset-0 before:-z-10 before:rounded-full before:bg-white before:shadow-sm',
		'group-data-checked:before:bg-(--radio-checked-bg)',
		// Light — border
		'border border-zinc-950/15',
		'group-data-checked:border-transparent group-data-checked:bg-(--radio-checked-border)',
		// Light — after pseudo (inset highlight)
		'after:absolute after:inset-0 after:rounded-full after:shadow-[inset_0_1px_--theme(--color-white/15%)]',
		// Light — indicator
		'[--radio-indicator:transparent]',
		'group-data-checked:[--radio-indicator:var(--radio-checked-indicator)]',
		// Hover
		'group-hover:border-zinc-950/30',
		'group-hover:group-data-checked:border-transparent',
		'group-hover:[--radio-indicator:var(--color-zinc-900)]/10',
		'group-hover:group-data-checked:[--radio-indicator:var(--radio-checked-indicator)]',
		// Focus
		'group-focus-visible:outline group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-blue-600',
		// Disabled
		'group-disabled:opacity-50',
		'group-disabled:border-zinc-950/25 group-disabled:bg-zinc-950/5 group-disabled:[--radio-checked-indicator:var(--color-zinc-950)]/50 group-disabled:before:bg-transparent',
		// Dark
		'dark:before:hidden',
		'dark:bg-white/5 dark:group-data-checked:bg-(--radio-checked-bg)',
		'dark:border-white/15 dark:group-data-checked:border-white/5',
		'dark:after:-inset-px dark:after:hidden dark:after:rounded-full dark:group-data-checked:after:block',
		// Dark — hover
		'dark:group-hover:border-white/30',
		'dark:group-hover:group-data-checked:border-white/5',
		'dark:group-hover:[--radio-indicator:var(--color-zinc-700)]',
		'dark:group-hover:group-data-checked:[--radio-indicator:var(--radio-checked-indicator)]',
		// Dark — disabled
		'dark:group-disabled:border-white/20 dark:group-disabled:bg-white/2.5 dark:group-disabled:[--radio-checked-indicator:var(--color-white)]/50 dark:group-data-checked:group-disabled:after:hidden',
	],
	{
		variants: {
			color: nuri.radio,
		},
		defaultVariants: {
			color: 'zinc',
		},
	},
)
