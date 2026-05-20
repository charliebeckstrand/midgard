import {
	defineRecipe,
	iro,
	narabi,
	omote,
	sen,
	shaku,
	type VariantPropsOf,
} from '../../core/recipe'
import { definePanelRecipe } from '../genkei/panel'

export const k = definePanelRecipe({
	panel: defineRecipe({
		base: [
			...omote.panel.chrome.flat(),
			narabi.panel.base,
			'absolute overflow-y-auto',
			'sm:rounded-xl',
		],
		side: {
			right: [
				'inset-y-0 right-0 w-full',
				'max-sm:rounded-r-none',
				'sm:top-4 sm:right-4 sm:bottom-4',
			],
			left: ['inset-y-0 left-0 w-full', 'max-sm:rounded-l-none', 'sm:top-4 sm:left-4 sm:bottom-4'],
			top: narabi.slide.top,
			bottom: narabi.slide.bottom,
		},
		size: shaku.panel,
		surface: {
			glass: [...omote.glass],
			flat: [...omote.panel.bg],
		},
		compound: [
			{ side: 'right', size: 'full', class: 'sm:left-4' },
			{ side: 'left', size: 'full', class: 'sm:right-4' },
		],
		defaults: { side: 'right', size: 'md', surface: 'flat' },
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
	actions: { extra: 'px-6 pb-6' },
	body: { extra: ['flex-1 overflow-y-auto px-6 first:pt-6'] },
	close: {
		base: [...iro.text.muted, sen.focus.inset, 'rounded-md', 'absolute right-5 top-5', 'p-1'],
	},
})

export type SheetPanelVariants = VariantPropsOf<typeof k.panel>
