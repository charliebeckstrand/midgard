import { cva } from 'class-variance-authority'
import { buttonColors } from '../../recipes/colors'

export const button = cva(
	[
		'relative isolate inline-flex w-fit items-center justify-center gap-x-2 rounded-lg text-base/6 font-semibold select-none',
		'focus:outline-hidden focus-visible:outline-1 focus-visible:-outline-offset-1 focus-visible:outline-blue-600',
		'disabled:opacity-50',
		'*:data-[slot=icon]:-mx-0.5 *:data-[slot=icon]:my-0.5 *:data-[slot=icon]:size-5 *:data-[slot=icon]:shrink-0 *:data-[slot=icon]:self-center *:data-[slot=icon]:text-(--btn-icon) sm:*:data-[slot=icon]:my-1 sm:*:data-[slot=icon]:size-4',
		'forced-colors:[--btn-icon:ButtonText] forced-colors:hover:[--btn-icon:ButtonText]',
	],
	{
		variants: {
			variant: {
				solid: [
					'items-baseline border px-[calc(--spacing(3.5)-1px)] py-[calc(--spacing(2.5)-1px)] sm:px-[calc(--spacing(3)-1px)] sm:py-[calc(--spacing(1.5)-1px)] ',
					'border-transparent bg-(--btn-border)',
					'dark:bg-(--btn-bg)',
					'before:absolute before:inset-0 before:-z-10 before:rounded-[calc(var(--radius-lg)-1px)] before:bg-(--btn-bg)',
					'before:shadow-sm',
					'dark:before:hidden',
					'dark:border-white/5',
					'after:absolute after:inset-0 after:-z-10 after:rounded-[calc(var(--radius-lg)-1px)]',
					'after:shadow-[inset_0_1px_--theme(--color-white/15%)]',
					'active:after:bg-(--btn-hover-overlay) not-disabled:hover:after:bg-(--btn-hover-overlay)',
					'dark:after:-inset-px dark:after:rounded-lg',
					'disabled:before:shadow-none disabled:after:shadow-none',
				],
				outline: [
					'items-baseline border px-[calc(--spacing(3.5)-1px)] py-[calc(--spacing(2.5)-1px)] sm:px-[calc(--spacing(3)-1px)] sm:py-[calc(--spacing(1.5)-1px)] ',
					'border-zinc-950/10 text-zinc-950 active:bg-zinc-950/2.5 not-disabled:hover:bg-zinc-950/2.5',
					'dark:border-white/15 dark:text-white dark:[--btn-bg:transparent] dark:active:bg-white/5 dark:not-disabled:hover:bg-white/5',
					'[--btn-icon:var(--color-zinc-500)] active:[--btn-icon:var(--color-zinc-700)] hover:[--btn-icon:var(--color-zinc-700)] dark:active:[--btn-icon:var(--color-zinc-400)] dark:hover:[--btn-icon:var(--color-zinc-400)]',
				],
				plain: [
					'items-baseline border border-transparent px-[calc(--spacing(3.5)-1px)] py-[calc(--spacing(2.5)-1px)] sm:px-[calc(--spacing(3)-1px)] sm:py-[calc(--spacing(1.5)-1px)] ',
					'text-zinc-950 active:bg-zinc-950/5 not-disabled:hover:bg-zinc-950/5',
					'dark:text-white dark:active:bg-white/10 dark:not-disabled:hover:bg-white/10',
					'[--btn-icon:var(--color-zinc-500)] active:[--btn-icon:var(--color-zinc-700)] hover:[--btn-icon:var(--color-zinc-700)] dark:[--btn-icon:var(--color-zinc-500)] dark:active:[--btn-icon:var(--color-zinc-400)] dark:hover:[--btn-icon:var(--color-zinc-400)]',
				],
				ghost: [
					'text-zinc-950 dark:text-white',
					'[--btn-icon:var(--color-zinc-500)] dark:[--btn-icon:var(--color-zinc-400)]',
				],
			},
			color: buttonColors,
		},
		defaultVariants: {
			variant: 'solid',
			color: 'zinc',
		},
	},
)
