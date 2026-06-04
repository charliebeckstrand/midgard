import { defineRecipe, type VariantProps } from '../../core/recipe'
import { bridge } from '../katakana'
import { omote, shaku, ugoki } from '../kiso'
import { panel } from '../kiso/panel'

const { glass } = omote
const { popover } = ugoki
const { surface, layout } = panel

export const k = {
	...bridge.panel(panel, {
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
