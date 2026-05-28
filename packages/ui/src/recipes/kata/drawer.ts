import { defineRecipe, type VariantProps } from '../../core/recipe'
import { panel as panelApplicator } from '../katakana'
import { iro, kasane, narabi, omote, sen, ugoki } from '../kiso'
import { panel } from '../kiso/panel'

export const k = {
	...panelApplicator({
		panel: defineRecipe({
			base: [
				...panel.surface.chrome.flat(),
				panel.layout.base,
				'fixed inset-x-0 bottom-0',
				'overflow-hidden',
				'w-full max-h-[85dvh]',
				'rounded-t-xl',
			],
			surface: {
				glass: [...omote.glass],
				flat: [...panel.surface.bg],
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
		body: { extra: [narabi.fill, 'overflow-y-auto overscroll-y-contain', 'px-6 last:mb-6'] },
		close: {
			base: [
				'absolute right-4 top-4',
				'p-1',
				...iro.text.muted,
				sen.focus.inset,
				kasane.rounded.md,
			],
		},
	}),
	motion: ugoki.panel.bottom,
}

export type DrawerPanelVariants = VariantProps<typeof k.panel>
