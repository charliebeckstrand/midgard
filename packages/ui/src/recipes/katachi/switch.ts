import { tv, type VariantProps } from 'tailwind-variants'
import { iro } from '../iro'
import { kage } from '../kage'
import { ki } from '../ki'
import { maru } from '../maru'
import { nuri } from '../nuri'
import { waku } from '../waku'

export const switchRecipe = tv({
	base: [
		'relative inline-flex shrink-0 items-center',
		ki.outline,
		'cursor-pointer',
		'has-checked:*:data-[slot=switch-thumb]:bg-(--switch)',
		'has-checked:*:data-[slot=switch-thumb]:shadow-(--switch-shadow)',
		'has-checked:*:data-[slot=switch-thumb]:ring-(--switch-ring)',
		maru.roundedFull,
		...nuri.switchTrack,
		'has-checked:bg-(--switch-bg) has-checked:ring-(--switch-bg-ring) has-checked:ring-inset',
		'not-has-[:disabled]:not-has-[:checked]:hover:bg-zinc-300',
		'dark:not-has-[:disabled]:not-has-[:checked]:hover:bg-white/15',
		'has-[:disabled]:opacity-50 has-[:disabled]:cursor-not-allowed',
	],
	variants: {
		color: nuri.switch,
		size: {
			sm: [
				'h-5 w-8',
				'*:data-[slot=switch-thumb]:size-3',
				'has-checked:*:data-[slot=switch-thumb]:left-4',
			],
			md: [
				'h-6 w-10',
				'*:data-[slot=switch-thumb]:size-4',
				'has-checked:*:data-[slot=switch-thumb]:left-5',
			],
			lg: [
				'h-7 w-12',
				'*:data-[slot=switch-thumb]:size-5',
				'has-checked:*:data-[slot=switch-thumb]:left-6',
			],
		},
	},
	defaultVariants: { color: 'zinc', size: 'md' },
})

export const switchInput = tv({ base: waku.hidden })

export const switchThumb = tv({
	base: [
		'absolute top-1 left-1 inline-block',
		maru.roundedFull,
		...nuri.switchThumb,
		kage.sm,
		'pointer-events-none',
		'transition-[left] duration-200 ease-in-out',
	],
})

export const switchField = tv({
	base: '*:data-[slot=control]:row-span-2 *:data-[slot=control]:mt-0',
	variants: {
		size: {
			sm: 'grid-cols-[2rem_1fr]',
			md: 'grid-cols-[2.5rem_1fr]',
			lg: 'grid-cols-[3rem_1fr]',
		},
	},
	defaultVariants: { size: 'md' },
})

export const slots = { disabled: iro.text.disabled }

export type SwitchVariants = VariantProps<typeof switchRecipe>
export type SwitchFieldVariants = VariantProps<typeof switchField>
