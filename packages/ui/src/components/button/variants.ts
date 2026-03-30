import { cva, type VariantProps } from 'class-variance-authority'
import { katachi, ki, nuri, yasumi } from '../../recipes'

type ButtonColor = keyof typeof nuri.button

const solidCompoundVariants = (
	Object.entries(nuri.button) as [ButtonColor, (typeof nuri.button)[ButtonColor]][]
).map(([color, classes]) => ({
	variant: 'solid' as const,
	color,
	className: classes,
}))

export const buttonVariants = cva(
	[
		// Layout
		'relative isolate inline-flex items-center justify-center gap-x-2',
		'px-3.5 py-2.5 text-sm/6 font-semibold',
		// Shape + icon
		katachi.maru,
		katachi.icon,
		// Focus + disabled
		ki.reset,
		ki.ring,
		yasumi.base,
		// Cursor
		'cursor-default',
	],
	{
		variants: {
			variant: {
				solid: [
					// Border + bg layer with custom properties
					'border border-(--btn-border)',
					'bg-(--btn-bg)',
					// Hover overlay
					'before:absolute before:inset-0 before:-z-10 before:rounded-[calc(var(--radius-lg)-1px)]',
					'before:bg-(--btn-hover-overlay)',
					'before:opacity-0 hover:before:opacity-100',
					// Highlight on top edge
					'after:absolute after:inset-0 after:-z-10 after:rounded-[calc(var(--radius-lg)-1px)]',
					'after:shadow-[shadow:inset_0_1px_theme(--color-white/15%)]',
					// Active press
					'active:after:bg-(--btn-hover-overlay) active:after:opacity-100',
					// Icon color
					'[--btn-icon:var(--color-zinc-500)] *:data-[slot=icon]:text-(--btn-icon)',
				],
				outline: [
					'border',
					'border-zinc-950/10 dark:border-white/15',
					'text-zinc-950 dark:text-white',
					'bg-transparent',
					'hover:bg-zinc-950/2.5 dark:hover:bg-white/5',
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
		compoundVariants: solidCompoundVariants,
		defaultVariants: {
			variant: 'solid',
			color: 'zinc',
		},
	},
)

export type ButtonVariants = VariantProps<typeof buttonVariants>
