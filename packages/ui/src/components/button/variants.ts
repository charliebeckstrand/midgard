import { cva, type VariantProps } from 'class-variance-authority'
import { colorKeys, compoundColors } from '../../core'
import { katachi, ki, nuri, yasumi } from '../../recipes'

export const buttonVariants = cva(
	[
		// Layout
		'relative isolate inline-flex items-center justify-center gap-x-2',
		// Sizing
		'px-[calc(--spacing(3)-1px)] py-[calc(--spacing(2)-1px)]',
		// Shape
		katachi.radius,
		// Font
		'font-semibold',
		// Icon slots
		katachi.icon,
		// Icon-only — square with equal padding when only child is an icon
		// TouchTarget wraps children in a fragment with a hidden <span> + {children},
		// so icon-only buttons have exactly 2 element children: the span and the icon.
		// :nth-child(2):last-child ensures the icon is the only real child.
		'[&:has(>[data-slot=icon]:nth-child(2):last-child)]:px-0 [&:has(>[data-slot=icon]:nth-child(2):last-child)]:py-0',
		'[&:has(>[data-slot=icon]:nth-child(2):last-child)]:size-10',
		'[&:has(>[data-slot=icon]:nth-child(2):last-child)]:gap-0',
		// Focus
		ki.ring,
		// Disabled
		yasumi.base,
		// Cursor
		'cursor-default',
		// Active — scale down instead of color change (not when disabled)
		'not-disabled:active:scale-[0.99] transition-transform duration-100',
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
					'not-disabled:hover:before:bg-[var(--btn-hover-overlay)]',
					// Icon color
					'*:data-[slot=icon]:text-[var(--btn-icon)]',
				],
				outline: [
					'border',
					'border-zinc-950/10 dark:border-white/15',
					'text-zinc-950 dark:text-white',
					'bg-transparent not-disabled:hover:bg-zinc-950/2.5 dark:not-disabled:hover:bg-white/5',
					'*:data-[slot=icon]:fill-zinc-500 dark:*:data-[slot=icon]:fill-zinc-400',
				],
				plain: [
					'border border-transparent',
					'text-zinc-950 dark:text-white',
					'not-disabled:hover:bg-zinc-950/5 dark:not-disabled:hover:bg-white/10',
					'*:data-[slot=icon]:fill-zinc-500 dark:*:data-[slot=icon]:fill-zinc-400',
				],
				ghost: [
					'border border-transparent',
					'text-zinc-950 dark:text-white',
					'*:data-[slot=icon]:fill-zinc-500 dark:*:data-[slot=icon]:fill-zinc-400',
				],
			},
			color: colorKeys(nuri.button),
		},
		compoundVariants: compoundColors('solid', nuri.button),
		defaultVariants: {
			variant: 'solid',
			color: 'zinc',
		},
	},
)

export type ButtonVariants = VariantProps<typeof buttonVariants>
