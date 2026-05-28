import { defineRecipe, type VariantProps } from '../../core/recipe'
import { panel as panelApplicator } from '../katakana'
import { omote, shaku, ugoki } from '../kiso'
import { panel } from '../kiso/panel'

const { glass } = omote
const { panel: shakuPanel } = shaku
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
			size: shakuPanel,
			defaults: { size: 'lg', surface: 'flat' },
		}),
	}),
	motion: { desktop: ugoki.popover, mobile: ugoki.panel.bottom },
}

export type DialogPanelVariants = VariantProps<typeof k.panel>
