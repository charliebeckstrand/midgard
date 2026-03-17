import { cva } from 'class-variance-authority'
import { checkboxColors } from '../../recipes/colors'

export const checkbox = cva(
	[
		// Layout
		'relative isolate flex size-4.5 items-center justify-center rounded-[0.3125rem] sm:size-4',
		// Light — before pseudo (visual bg/shadow)
		'before:absolute before:inset-0 before:-z-10 before:rounded-[calc(0.3125rem-1px)] before:bg-white before:shadow-sm',
		'group-data-checked:before:bg-(--checkbox-checked-bg)',
		// Light — border
		'border border-zinc-950/15',
		'group-data-checked:border-transparent group-data-checked:bg-(--checkbox-checked-border)',
		// Light — after pseudo (inset highlight)
		'after:absolute after:inset-0 after:rounded-[calc(0.3125rem-1px)] after:shadow-[inset_0_1px_--theme(--color-white/15%)]',
		// Hover
		'group-hover:border-zinc-950/30',
		'group-hover:group-data-checked:border-transparent',
		// Focus
		'group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-blue-600',
		// Disabled
		'group-disabled:opacity-50',
		'group-disabled:border-zinc-950/25 group-disabled:bg-zinc-950/5 group-disabled:[--checkbox-check:var(--color-zinc-950)]/50 group-disabled:before:bg-transparent',
		// Dark
		'dark:before:hidden',
		'dark:bg-white/5 dark:group-data-checked:bg-(--checkbox-checked-bg)',
		'dark:border-white/15 dark:group-data-checked:border-white/5',
		'dark:after:-inset-px dark:after:hidden dark:after:rounded-[0.3125rem] dark:group-data-checked:after:block',
		// Dark — hover
		'dark:group-hover:border-white/30',
		'dark:group-hover:group-data-checked:border-white/5',
		// Dark — disabled
		'dark:group-disabled:border-white/20 dark:group-disabled:bg-white/2.5 dark:group-disabled:[--checkbox-check:var(--color-white)]/50 dark:group-data-checked:group-disabled:after:hidden',
		// Forced colors
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
