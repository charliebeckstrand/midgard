import { cva, type VariantProps } from 'class-variance-authority'
import { colorKeys, compoundColors } from '../../core'
import { ki, maru, nuri, sumi, take, yasumi } from '../../recipes'

export const buttonVariants = cva(
	[
		maru.rounded,
		take.icon,
		ki.ring,
		yasumi.disabled,
		'relative isolate inline-flex items-center justify-center gap-x-2 font-semibold',
		'cursor-default',
		// Hover overlay pseudo — rounded-[inherit] so rounded-full etc. always match
		'after:absolute after:inset-0 after:-z-10 after:rounded-[inherit]',
	],
	{
		variants: {
			variant: {
				solid: [
					// Border
					'border border-transparent',
					// Background on the element itself so custom bg-* classes can override
					'bg-[var(--btn-bg)]',
					'border-[var(--btn-border)]',
					'shadow-sm',
					// Hover + active via after overlay
					'not-disabled:hover:after:bg-black/10',
					'active:after:bg-black/15',
					// Disabled
					'disabled:shadow-none',
					// Dark
					'dark:border-white/5',
					'dark:not-disabled:hover:after:bg-white/10',
					'dark:active:after:bg-white/15',
					// Icon color
					'*:data-[slot=icon]:text-[var(--btn-icon)]',
				],
				outline: [
					'border',
					'border-zinc-950/10 dark:border-white/15',
					sumi.text,
					'bg-white dark:bg-zinc-900',
					// Hover via after overlay
					'not-disabled:hover:after:bg-zinc-950/[0.025]',
					'dark:not-disabled:hover:after:bg-white/5',
					sumi.fillIcon,
				],
				plain: [
					'border border-transparent',
					sumi.text,
					// Hover via after overlay
					'not-disabled:hover:after:bg-zinc-950/5',
					'dark:not-disabled:hover:after:bg-white/10',
					sumi.fillIcon,
				],
				ghost: ['border border-transparent', sumi.text, sumi.fillIcon],
			},
			color: colorKeys(nuri.button),
			size: take.button,
		},
		compoundVariants: compoundColors('solid', nuri.button),
		defaultVariants: {
			variant: 'solid',
			color: 'zinc',
			size: 'md',
		},
	},
)

export const iconOnlySize = cva('p-0 gap-0', {
	variants: {
		size: {
			sm: 'size-8',
			md: 'size-10',
			lg: 'size-12',
		},
	},
	defaultVariants: {
		size: 'md',
	},
})

export type ButtonVariants = VariantProps<typeof buttonVariants>
