import { cva } from 'class-variance-authority'
import { checkboxColors } from '../../recipes/colors'

export const checkbox = cva(
	[
		'relative isolate flex size-4.5 items-center justify-center rounded-[0.3125rem] sm:size-4',
		'before:absolute before:inset-0 before:-z-10 before:rounded-[calc(0.3125rem-1px)] before:bg-white before:shadow-sm',
		'group-data-checked:before:bg-(--checkbox-checked-bg)',
		'dark:before:hidden',
		'dark:bg-white/5 dark:group-data-checked:bg-(--checkbox-checked-bg)',
		'border border-zinc-950/15 group-data-checked:border-transparent group-hover:group-data-checked:border-transparent group-hover:border-zinc-950/30 group-data-checked:bg-(--checkbox-checked-border)',
		'dark:border-white/15 dark:group-data-checked:border-white/5 dark:group-hover:group-data-checked:border-white/5 dark:group-hover:border-white/30',
		'after:absolute after:inset-0 after:rounded-[calc(0.3125rem-1px)] after:shadow-[inset_0_1px_--theme(--color-white/15%)]',
		'dark:after:-inset-px dark:after:hidden dark:after:rounded-[0.3125rem] dark:group-data-checked:after:block',
		'group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-blue-600',
		'group-disabled:opacity-50',
		'group-disabled:border-zinc-950/25 group-disabled:bg-zinc-950/5 group-disabled:[--checkbox-check:var(--color-zinc-950)]/50 group-disabled:before:bg-transparent',
		'dark:group-disabled:border-white/20 dark:group-disabled:bg-white/2.5 dark:group-disabled:[--checkbox-check:var(--color-white)]/50 dark:group-data-checked:group-disabled:after:hidden',
		'forced-colors:[--checkbox-check:HighlightText] forced-colors:[--checkbox-checked-bg:Highlight] forced-colors:group-disabled:[--checkbox-check:Highlight]',
		'dark:forced-colors:[--checkbox-check:HighlightText] dark:forced-colors:[--checkbox-checked-bg:Highlight] dark:forced-colors:group-disabled:[--checkbox-check:Highlight]',
	],
	{
		variants: {
			color: checkboxColors,
		},
		defaultVariants: {
			color: 'zinc',
		},
	},
)
