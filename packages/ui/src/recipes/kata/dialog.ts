import { defineRecipe, type VariantProps } from '../../core/recipe'
import { bridge } from '../katakana'
import { omote, shaku, ugoki } from '../kiso'
import { panel } from '../kiso/panel'

const { glass, backdrop } = omote
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
				layout.inset.x,
				layout.inset.top,
				layout.inset.bottom,
				// Each cap is a share of the overlay root. Above `sm`, the root has an
				// inset of 1rem on each edge, so the full share stops 1rem short of each.
				'max-sm:rounded-t-2xl max-sm:rounded-b-none max-sm:max-h-[85%] max-sm:overflow-y-auto max-sm:overscroll-contain',
				// Below `sm`, the panel sits on the bottom edge. In a page with
				// `viewport-fit=cover`, this keeps its content clear of the home
				// indicator.
				...layout.inset.safe,
				'sm:rounded-2xl sm:max-h-full',
			],
			surface: {
				glass: [...glass],
				flat: [...surface.bg],
			},
			width: shaku.panel,
			defaults: { width: 'lg', surface: 'flat' },
		}),
		backdrop: bridge.backdrop(backdrop),
	}),
	motion: { desktop: popover, mobile: ugoki.panel.bottom },
}

/** Recipe variant props for the {@link Dialog} panel — its styling axes (`surface`, `width`), for consumers composing custom slots. */
export type DialogPanelVariants = Omit<VariantProps<typeof k.panel>, 'surface' | 'width'> & {
	/** The surface of the panel: `flat` is opaque, and `glass` is translucent and blurred. @defaultValue 'flat' */
	surface?: VariantProps<typeof k.panel>['surface']
	/** The maximum width of the panel. @defaultValue 'lg' */
	width?: VariantProps<typeof k.panel>['width']
}
