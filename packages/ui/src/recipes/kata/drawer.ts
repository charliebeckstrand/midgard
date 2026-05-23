import { defineRecipe, type VariantProps } from '../../core/recipe'
import { panel } from '../katakana'
import { iro, narabi, omote, sen, ugoki } from '../kiso'

export const k = {
	...panel({
		panel: defineRecipe({
			base: [
				...omote.panel.chrome.flat(),
				narabi.panel.base,
				'fixed inset-x-0 bottom-0',
				'overflow-hidden',
				'w-full max-h-[85dvh]',
				'rounded-t-xl',
			],
			surface: {
				glass: [...omote.glass],
				flat: [...omote.panel.bg],
			},
			defaults: { surface: 'flat' },
		}),
		backdrop: defineRecipe({
			base: 'absolute inset-0',
			surface: {
				glass: [...omote.backdrop.glass],
				flat: [...omote.backdrop.base],
			},
			defaults: { surface: 'flat' },
		}),
		title: { extra: 'px-6 pt-6' },
		description: { extra: 'px-6' },
		footer: { extra: 'px-6 pb-6' },
		body: { extra: ['flex-1 overflow-y-auto overscroll-y-contain', 'px-6 last:mb-6'] },
		close: {
			base: ['absolute right-4 top-4', 'p-1', ...iro.text.muted, sen.focus.inset, 'rounded-md'],
		},
	}),
	motion: ugoki.panel.bottom,
}

export type DrawerPanelVariants = VariantProps<typeof k.panel>
