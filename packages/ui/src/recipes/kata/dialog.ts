import { defineRecipe, narabi, omote, shaku, type VariantPropsOf } from '..'
import { definePanelRecipe } from '../genkei/panel'

export const k = definePanelRecipe({
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
})

export type DialogPanelVariants = VariantPropsOf<typeof k.panel>
