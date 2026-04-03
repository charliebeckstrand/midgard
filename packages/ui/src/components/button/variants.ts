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
	],
	{
		variants: {
			variant: {
				solid: [
					// Border
					'border border-transparent',
					// Background via custom property
					'bg-[var(--btn-bg)]',
					// Border overlay
					'border-[var(--btn-border)]',
					// Icon color
					'*:data-[slot=icon]:text-[var(--btn-icon)]',
				],
				outline: [
					'border',
					'border-zinc-950/10 dark:border-white/15',
					sumi.text,
					'bg-white dark:bg-zinc-900 not-disabled:hover:bg-zinc-100 dark:not-disabled:hover:bg-zinc-800',
					sumi.fillIcon,
				],
				plain: [
					'border border-transparent',
					sumi.text,
					'not-disabled:hover:bg-zinc-950/5 dark:not-disabled:hover:bg-white/10',
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
