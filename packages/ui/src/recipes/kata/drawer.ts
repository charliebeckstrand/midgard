import { defineRecipe, type VariantProps } from '../../core/recipe'
import { bridge } from '../katakana'
import { narabi, omote, ugoki } from '../kiso'
import { panel } from '../kiso/panel'

const { flex } = narabi
const { glass, backdrop } = omote
const { surface, layout } = panel

export const k = {
	...bridge.panel(panel, {
		panel: defineRecipe({
			base: [
				...surface.chrome.flat(),
				layout.base,
				'fixed inset-x-0 bottom-0',
				'overflow-hidden',
				'w-full max-h-[85dvh]',
				'rounded-t-xl',
			],
			surface: {
				glass: [...glass],
				flat: [...surface.bg],
			},
			defaults: { surface: 'flat' },
		}),
		backdrop: bridge.backdrop(backdrop),
		title: { extra: 'px-6 pt-6' },
		description: { extra: 'px-6' },
		footer: { extra: 'px-6 pb-6' },
		body: { extra: [flex.fill, 'overflow-y-auto overscroll-y-contain', 'px-6 last:mb-6'] },
	}),
	motion: ugoki.panel.bottom,
}

/** Recipe variant props for the {@link Drawer} panel — its styling axes (`surface`), for consumers composing custom slots. */
export type DrawerPanelVariants = VariantProps<typeof k.panel>
