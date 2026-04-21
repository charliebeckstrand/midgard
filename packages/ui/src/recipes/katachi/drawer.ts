import { tv, type VariantProps } from 'tailwind-variants'
import { definePanelRecipe } from '../../core/recipe'
import { iro } from '../iro'
import { ki } from '../ki'
import { maru } from '../maru'
import { narabi } from '../narabi'
import { omote } from '../omote'

export const drawer = definePanelRecipe({
	panel: tv({
		base: [
			...omote.panel.chrome.flat(),
			narabi.panel.base,
			'fixed inset-x-0 bottom-0',
			'overflow-hidden',
			'w-full max-h-[85dvh]',
			'rounded-t-xl',
		],
		variants: {
			glass: {
				true: [...omote.glass],
				false: [...omote.panel.bg],
			},
		},
		defaultVariants: { glass: false },
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
	body: { extra: ['flex-1 overflow-y-auto overscroll-y-contain', 'px-6 last:mb-6'] },
	close: { base: ['absolute right-4 top-4', 'p-1', ...iro.text.muted, ki.inset, maru.rounded.md] },
})

export type DrawerPanelVariants = VariantProps<typeof drawer.panel>
