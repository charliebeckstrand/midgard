import { defineRecipe, type VariantProps } from '../../core/recipe'
import { bridge } from '../katakana'
import { omote, shaku, ugoki } from '../kiso'
import { panel } from '../kiso/panel'

const { backdrop } = omote
const { popover } = ugoki
const { surface, layout } = panel

/**
 * The panel and backdrop recipes of the {@link Dialog}. Dialog uses the default
 * slots of `createPanel`, so it does not build them through `bridge.panel`.
 */
export const k = {
	panel: defineRecipe({
		base: [
			...surface.chrome,
			layout.base,
			'relative',
			'w-full',
			layout.inset.x,
			layout.inset.top,
			// The bottom padding. On the bottom edge, the `align` table also adds the
			// inset of the home indicator in a page with `viewport-fit=cover`.
			layout.inset.safe,
		],
		surface: surface.axis,
		width: shaku.panel,
		defaults: { width: 'lg', surface: 'flat' },
	}),
	backdrop: bridge.backdrop(backdrop),
	/**
	 * The classes of each `align` of the panel and of the box around it. Each
	 * value writes the same properties, so a breakpoint replaces each one
	 * (`resolveVariant`). `bottom` docks the panel to the bottom edge as a sheet:
	 * it spans the width, rounds its top corners only, and scrolls past 85% of
	 * the height. `center` and `top` float it in a box with an inset of 1rem on
	 * each edge, so its full height stops 1rem short of each.
	 */
	align: {
		box: {
			bottom: 'items-end p-0',
			center: 'items-center p-4',
			top: 'items-start p-4',
		},
		panel: {
			bottom:
				'rounded-t-2xl rounded-b-none max-h-[85%] overflow-y-auto overscroll-contain [--ui-panel-safe:env(safe-area-inset-bottom)]',
			center:
				'rounded-t-2xl rounded-b-2xl max-h-full overflow-y-visible overscroll-auto [--ui-panel-safe:0px]',
			top: 'rounded-t-2xl rounded-b-2xl max-h-full overflow-y-visible overscroll-auto [--ui-panel-safe:0px]',
		},
	},
	/** The motion of a floating panel (`desktop`) and of a panel on the bottom edge (`mobile`). */
	motion: { desktop: popover, mobile: ugoki.panel.bottom },
	/**
	 * The motion under reduced motion: the panel on the bottom edge shows with no
	 * slide. The fade of a floating panel moves no box, so it stays as it is.
	 */
	still: { desktop: popover, mobile: ugoki.still(ugoki.panel.bottom) },
}

/** Recipe variant props for the {@link Dialog} panel: its styling axes (`surface`, `width`), for consumers composing custom slots. */
export type DialogPanelVariants = Omit<VariantProps<typeof k.panel>, 'surface' | 'width'> & {
	/** The surface of the panel: `flat` is opaque, and `glass` is translucent and blurred. @defaultValue 'flat' */
	surface?: VariantProps<typeof k.panel>['surface']
	/** The maximum width of the panel. @defaultValue 'lg' */
	width?: VariantProps<typeof k.panel>['width']
}
