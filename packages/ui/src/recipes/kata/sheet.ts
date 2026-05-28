import { defineRecipe, type VariantProps } from '../../core/recipe'
import { panel as panelApplicator } from '../katakana'
import { iro, kasane, narabi, omote, sen, shaku, ugoki } from '../kiso'
import { panel } from '../kiso/panel'

export const k = {
	...panelApplicator({
		panel: defineRecipe({
			base: [
				...panel.surface.chrome.flat(),
				panel.layout.base,
				'absolute overflow-y-auto',
				'sm:rounded-xl',
			],
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
			size: shaku.panel,
			surface: {
				glass: [...omote.glass],
				flat: [...panel.surface.bg],
			},
			compound: [
				{ side: 'right', size: 'full', class: 'sm:left-4 sm:max-w-[calc(100%-2rem)]' },
				{ side: 'left', size: 'full', class: 'sm:right-4 sm:max-w-[calc(100%-2rem)]' },
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
		footer: { extra: 'px-6 pb-6' },
		body: { extra: [narabi.fill, 'overflow-y-auto px-6 first:pt-6'] },
		close: {
			base: [
				'absolute right-5 top-5',
				'p-1',
				...iro.text.muted,
				sen.focus.inset,
				kasane.radius.rounded.md,
			],
		},
	}),
	motion: ugoki.panel,
}

export type SheetPanelVariants = VariantProps<typeof k.panel>
