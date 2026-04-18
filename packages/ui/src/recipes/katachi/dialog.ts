import { tv, type VariantProps } from 'tailwind-variants'
import { narabi } from '../narabi'
import { omote } from '../omote'
import { take } from '../take'

export const dialogPanel = tv({
	base: [
		...omote.panel.chrome.flat(),
		narabi.panel.base,
		'relative',
		'w-full',
		'p-6',
		'max-sm:rounded-t-2xl max-sm:rounded-b-none max-sm:max-h-[calc(85dvh)] max-sm:overflow-y-auto',
		'sm:rounded-2xl sm:max-h-[calc(100dvh-2rem)]',
	],
	variants: {
		glass: {
			true: [...omote.glass],
			false: [...omote.panel.bg],
		},
		size: take.panel,
	},
	defaultVariants: { size: 'lg', glass: false },
})

export type DialogPanelVariants = VariantProps<typeof dialogPanel>
