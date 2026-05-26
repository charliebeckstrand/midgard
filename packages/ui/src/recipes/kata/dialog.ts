import { defineRecipe, type VariantProps } from '../../core/recipe'
import { panel } from '../katakana'
import { narabi, omote, shaku, ugoki } from '../kiso'

export const k = {
	...panel({
		panel: defineRecipe({
			base: [
				...omote.panel.chrome.flat(),
				narabi.panel.base,
				'relative',
				'w-full',
				'p-6',
				'max-sm:rounded-t-2xl max-sm:rounded-b-none max-sm:max-h-[calc(85dvh)] max-sm:overflow-y-auto',
				'sm:rounded-2xl sm:max-h-[calc(100dvh-2rem)]',
			],
			surface: {
				glass: [...omote.glass],
				flat: [...omote.panel.bg],
			},
			size: shaku.panel,
			defaults: { size: 'lg', surface: 'flat' },
		}),
	}),
	motion: { desktop: ugoki.popover, mobile: ugoki.panel.bottom },
}

export type DialogPanelVariants = VariantProps<typeof k.panel>
