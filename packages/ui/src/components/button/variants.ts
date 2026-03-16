import { cva } from 'class-variance-authority'

export const button = cva(
	[
		'relative isolate inline-flex items-baseline justify-center gap-x-2 rounded-lg border text-base/6 font-semibold select-none',
		'px-[calc(--spacing(3.5)-1px)] py-[calc(--spacing(2.5)-1px)] sm:px-[calc(--spacing(3)-1px)] sm:py-[calc(--spacing(1.5)-1px)] sm:text-sm/6',
		'focus:outline-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500',
		'disabled:opacity-50',
		'*:data-[slot=icon]:-mx-0.5 *:data-[slot=icon]:my-0.5 *:data-[slot=icon]:size-5 *:data-[slot=icon]:shrink-0 *:data-[slot=icon]:self-center *:data-[slot=icon]:text-(--btn-icon) sm:*:data-[slot=icon]:my-1 sm:*:data-[slot=icon]:size-4',
		'forced-colors:[--btn-icon:ButtonText] forced-colors:hover:[--btn-icon:ButtonText]',
	],
	{
		variants: {
			variant: {
				solid: [
					'border-transparent bg-(--btn-border)',
					'dark:bg-(--btn-bg)',
					'before:absolute before:inset-0 before:-z-10 before:rounded-[calc(var(--radius-lg)-1px)] before:bg-(--btn-bg)',
					'before:shadow-sm',
					'dark:before:hidden',
					'dark:border-white/5',
					'after:absolute after:inset-0 after:-z-10 after:rounded-[calc(var(--radius-lg)-1px)]',
					'after:shadow-[inset_0_1px_--theme(--color-white/15%)]',
					'active:after:bg-(--btn-hover-overlay) hover:after:bg-(--btn-hover-overlay)',
					'dark:after:-inset-px dark:after:rounded-lg',
					'disabled:before:shadow-none disabled:after:shadow-none',
				],
				outline: [
					'border-zinc-950/10 text-zinc-950 active:bg-zinc-950/2.5 hover:bg-zinc-950/2.5',
					'dark:border-white/15 dark:text-white dark:[--btn-bg:transparent] dark:active:bg-white/5 dark:hover:bg-white/5',
					'[--btn-icon:var(--color-zinc-500)] active:[--btn-icon:var(--color-zinc-700)] hover:[--btn-icon:var(--color-zinc-700)] dark:active:[--btn-icon:var(--color-zinc-400)] dark:hover:[--btn-icon:var(--color-zinc-400)]',
				],
				plain: [
					'border-transparent text-zinc-950 active:bg-zinc-950/5 hover:bg-zinc-950/5',
					'dark:text-white dark:active:bg-white/10 dark:hover:bg-white/10',
					'[--btn-icon:var(--color-zinc-500)] active:[--btn-icon:var(--color-zinc-700)] hover:[--btn-icon:var(--color-zinc-700)] dark:[--btn-icon:var(--color-zinc-500)] dark:active:[--btn-icon:var(--color-zinc-400)] dark:hover:[--btn-icon:var(--color-zinc-400)]',
				],
			},
			color: {
				zinc: [
					'text-white [--btn-bg:var(--color-zinc-900)] [--btn-border:var(--color-zinc-950)]/90 [--btn-hover-overlay:var(--color-white)]/10',
					'dark:text-white dark:[--btn-bg:var(--color-zinc-600)] dark:[--btn-hover-overlay:var(--color-white)]/5',
					'[--btn-icon:var(--color-zinc-400)] active:[--btn-icon:var(--color-zinc-300)] hover:[--btn-icon:var(--color-zinc-300)]',
				],
				white: [
					'text-zinc-950 [--btn-bg:white] [--btn-border:var(--color-zinc-950)]/10 [--btn-hover-overlay:var(--color-zinc-950)]/2.5 active:[--btn-border:var(--color-zinc-950)]/15 hover:[--btn-border:var(--color-zinc-950)]/15',
					'dark:[--btn-hover-overlay:var(--color-zinc-950)]/5',
					'[--btn-icon:var(--color-zinc-400)] active:[--btn-icon:var(--color-zinc-500)] hover:[--btn-icon:var(--color-zinc-500)]',
				],
				dark: [
					'text-white [--btn-bg:var(--color-zinc-900)] [--btn-border:var(--color-zinc-950)]/90 [--btn-hover-overlay:var(--color-white)]/10',
					'dark:[--btn-hover-overlay:var(--color-white)]/5 dark:[--btn-bg:var(--color-zinc-800)]',
					'[--btn-icon:var(--color-zinc-400)] active:[--btn-icon:var(--color-zinc-300)] hover:[--btn-icon:var(--color-zinc-300)]',
				],
				red: [
					'text-white [--btn-hover-overlay:var(--color-white)]/10 [--btn-bg:var(--color-red-600)] [--btn-border:var(--color-red-700)]/90',
					'[--btn-icon:var(--color-red-300)] active:[--btn-icon:var(--color-red-200)] hover:[--btn-icon:var(--color-red-200)]',
				],
				orange: [
					'text-white [--btn-hover-overlay:var(--color-white)]/10 [--btn-bg:var(--color-orange-500)] [--btn-border:var(--color-orange-600)]/90',
					'[--btn-icon:var(--color-orange-300)] active:[--btn-icon:var(--color-orange-200)] hover:[--btn-icon:var(--color-orange-200)]',
				],
				amber: [
					'text-amber-950 [--btn-hover-overlay:var(--color-white)]/25 [--btn-bg:var(--color-amber-400)] [--btn-border:var(--color-amber-500)]/80',
					'[--btn-icon:var(--color-amber-600)]',
				],
				green: [
					'text-white [--btn-hover-overlay:var(--color-white)]/10 [--btn-bg:var(--color-green-600)] [--btn-border:var(--color-green-700)]/90',
					'[--btn-icon:var(--color-white)]/60 active:[--btn-icon:var(--color-white)]/80 hover:[--btn-icon:var(--color-white)]/80',
				],
				blue: [
					'text-white [--btn-hover-overlay:var(--color-white)]/10 [--btn-bg:var(--color-blue-600)] [--btn-border:var(--color-blue-700)]/90',
					'[--btn-icon:var(--color-blue-400)] active:[--btn-icon:var(--color-blue-300)] hover:[--btn-icon:var(--color-blue-300)]',
				],
				indigo: [
					'text-white [--btn-hover-overlay:var(--color-white)]/10 [--btn-bg:var(--color-indigo-500)] [--btn-border:var(--color-indigo-600)]/90',
					'[--btn-icon:var(--color-indigo-300)] active:[--btn-icon:var(--color-indigo-200)] hover:[--btn-icon:var(--color-indigo-200)]',
				],
				violet: [
					'text-white [--btn-hover-overlay:var(--color-white)]/10 [--btn-bg:var(--color-violet-500)] [--btn-border:var(--color-violet-600)]/90',
					'[--btn-icon:var(--color-violet-300)] active:[--btn-icon:var(--color-violet-200)] hover:[--btn-icon:var(--color-violet-200)]',
				],
			},
		},
		defaultVariants: {
			variant: 'solid',
			color: 'zinc',
		},
	},
)
