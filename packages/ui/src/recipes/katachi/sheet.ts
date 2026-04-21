import { tv, type VariantProps } from 'tailwind-variants'
import { definePanelRecipe } from '../../core/recipe'
import { iro } from '../iro'
import { ki } from '../ki'
import { maru } from '../maru'
import { narabi } from '../narabi'
import { omote } from '../omote'
import { take } from '../take'

export const sheet = definePanelRecipe({
	panel: tv({
		base: [
			...omote.panel.chrome.flat(),
			narabi.panel.base,
			'absolute overflow-y-auto',
			'rounded-xl',
		],
		variants: {
			side: {
				right: [
					'inset-y-0 right-0 w-full',
					'max-sm:rounded-r-none',
					'sm:top-4 sm:right-4 sm:bottom-4',
				],
				left: [
					'inset-y-0 left-0 w-full',
					'max-sm:rounded-l-none',
					'sm:top-4 sm:left-4 sm:bottom-4',
				],
				top: narabi.slide.top,
				bottom: narabi.slide.bottom,
			},
			size: take.panel,
			glass: {
				true: [...omote.glass],
				false: [...omote.panel.bg],
			},
		},
		compoundVariants: [
			{ side: 'right', size: 'full', class: 'sm:left-4' },
			{ side: 'left', size: 'full', class: 'sm:right-4' },
		],
		defaultVariants: { side: 'right', size: 'md', glass: false },
	}),
	backdrop: tv({
		base: 'absolute inset-0',
		variants: {
			glass: {
				true: [...omote.backdrop.glass],
				false: [...omote.backdrop.base],
			},
		},
		defaultVariants: { glass: false },
	}),
	title: { extra: 'px-6 pt-6' },
	description: { extra: 'px-6' },
	actions: { extra: 'px-6 pb-6' },
	body: { extra: ['flex-1 overflow-y-auto px-6 first:pt-6'] },
	close: {
		base: [...iro.text.muted, ki.inset, maru.roundedMd, 'absolute right-5 top-5', 'p-1'],
	},
})

export type SheetPanelVariants = VariantProps<typeof sheet.panel>
