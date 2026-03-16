import { cva } from 'class-variance-authority'

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
			color: {
				zinc: '[--radio-checked-bg:var(--color-zinc-900)] [--radio-checked-border:var(--color-zinc-950)]/90 [--radio-checked-indicator:var(--color-white)] dark:[--radio-checked-bg:var(--color-zinc-600)]',
				white:
					'[--radio-checked-bg:var(--color-white)] [--radio-checked-border:var(--color-zinc-950)]/15 [--radio-checked-indicator:var(--color-zinc-900)]',
				dark: '[--radio-checked-bg:var(--color-zinc-900)] [--radio-checked-border:var(--color-zinc-950)]/90 [--radio-checked-indicator:var(--color-white)]',
				red: '[--radio-checked-indicator:var(--color-white)] [--radio-checked-bg:var(--color-red-600)] [--radio-checked-border:var(--color-red-800)]/90',
				amber:
					'[--radio-checked-bg:var(--color-amber-700)] [--radio-checked-border:var(--color-amber-600)]/80 [--radio-checked-indicator:var(--color-amber-100)]',
				green:
					'[--radio-checked-indicator:var(--color-white)] [--radio-checked-bg:var(--color-green-600)] [--radio-checked-border:var(--color-green-800)]/90',
				blue: '[--radio-checked-indicator:var(--color-white)] [--radio-checked-bg:var(--color-blue-600)] [--radio-checked-border:var(--color-blue-800)]/90',
				purple:
					'[--radio-checked-indicator:var(--color-white)] [--radio-checked-bg:var(--color-purple-600)] [--radio-checked-border:var(--color-purple-800)]/90',
				pink: '[--radio-checked-indicator:var(--color-white)] [--radio-checked-bg:var(--color-pink-700)] [--radio-checked-border:var(--color-pink-800)]/90',
			},
		},
		defaultVariants: {
			color: 'zinc',
		},
	},
)
