import { defineRecipe, type VariantProps } from '../../core/recipe'
import { panel as panelApplicator } from '../katakana'
import { panel } from '../katakana/panel'
import { omote, shaku, ugoki } from '../kiso'

const { glass } = omote
const { popover } = ugoki
const { surface, layout } = panel

export const k = {
	...panelApplicator({
		panel: defineRecipe({
			base: [
				...surface.chrome.flat(),
				layout.base,
				'relative',
				'w-full',
				'p-6',
				'max-sm:rounded-t-2xl max-sm:rounded-b-none max-sm:max-h-[calc(85dvh)] max-sm:overflow-y-auto',
				'sm:rounded-2xl sm:max-h-[calc(100dvh-2rem)]',
			],
			surface: {
				glass: [...glass],
				flat: [...surface.bg],
			},
			size: shaku.panel,
			defaults: { size: 'lg', surface: 'flat' },
		}),
	}),
	motion: { desktop: popover, mobile: ugoki.panel.bottom },
}

export type DialogPanelVariants = VariantProps<typeof k.panel>
