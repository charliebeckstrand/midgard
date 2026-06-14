import { defineRecipe, type VariantProps } from '../../core/recipe'
import { bridge } from '../katakana'
import { iro, kasane, narabi, omote, sen, ugoki } from '../kiso'
import { panel } from '../kiso/panel'

const { text } = iro
const { rounded } = kasane
const { flex } = narabi
const { glass, backdrop } = omote
const { focus } = sen
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
		backdrop: defineRecipe({
			base: 'absolute inset-0',
			surface: {
				glass: [...backdrop.glass],
				flat: [...backdrop.base],
			},
			defaults: { surface: 'flat' },
		}),
		title: { extra: 'px-6 pt-6' },
		description: { extra: 'px-6' },
		footer: { extra: 'px-6 pb-6' },
		body: { extra: [flex.fill, 'overflow-y-auto overscroll-y-contain', 'px-6 last:mb-6'] },
		close: {
			base: ['absolute right-4 top-4', 'p-1', ...text.muted, ...focus.inset, rounded.md],
		},
	}),
	motion: ugoki.panel.bottom,
}

/** Recipe variant props for the {@link Drawer} panel — its styling axes (`surface`), for consumers composing custom slots. */
export type DrawerPanelVariants = VariantProps<typeof k.panel>
