import { defineKata, type VariantProps } from '../../core/recipe'
import { shaku, ugoki } from '../kiso'
import { inset, panel } from '../kumi/panel'

const { popover } = ugoki

/** The panel of a `center` or a `top` align, which floats in the box. */
const floating =
	'rounded-t-2xl rounded-b-2xl max-h-full overflow-y-visible overscroll-auto [--ui-panel-safe:0px]'

/**
 * The unit of the {@link Dialog}: the panel (`base`) and the backdrop. Dialog
 * uses the default slots of `createPanel`.
 */
export const k = defineKata(
	{
		extends: panel,
		base: [
			'relative',
			'w-full',
			inset.x,
			inset.top,
			// The bottom padding. On the bottom edge, the `align` table also adds the
			// inset of the home indicator in a page with `viewport-fit=cover`.
			inset.safe,
		],
		/** The maximum width of the panel. */
		width: shaku.panel,
		/**
		 * The classes of each `align` of the panel and of the box around it. Each
		 * value writes the same properties, so a breakpoint replaces each one.
		 * `bottom` docks the panel to the bottom edge as a sheet: it spans the
		 * width, rounds its top corners only, and scrolls past 85% of the height.
		 * `center` and `top` float it in a box with an inset of 1rem on each edge,
		 * so its full height stops 1rem short of each.
		 */
		responsive: {
			align: {
				bottom:
					'rounded-t-2xl rounded-b-none max-h-[85%] overflow-y-auto overscroll-contain [--ui-panel-safe:env(safe-area-inset-bottom)]',
				center: floating,
				top: floating,
			},
		},
		slots: {
			/**
			 * The box around the panel. The overlay root is positioned in both modes,
			 * so the box fills the root: the part of the screen that the reader sees,
			 * or the `container`.
			 */
			box: {
				base: 'pointer-events-none absolute inset-0 flex min-h-full justify-center',
				responsive: {
					align: {
						bottom: 'items-end p-0',
						center: 'items-center p-4',
						top: 'items-start p-4',
					},
				},
			},
		},
		defaults: { width: 'lg' },
	},
	{
		/** The motion of a floating panel (`desktop`) and of a panel on the bottom edge (`mobile`). */
		motion: { desktop: popover, mobile: ugoki.panel.bottom },
		/**
		 * The motion under reduced motion: the panel on the bottom edge shows with no
		 * slide. The fade of a floating panel moves no box, so it stays as it is.
		 */
		still: { desktop: popover, mobile: ugoki.still(ugoki.panel.bottom) },
	},
)

/** Recipe variant props for the {@link Dialog} panel: its styling axes (`surface`, `width`), for consumers composing custom slots. */
export type DialogPanelVariants = Omit<VariantProps<typeof k>, 'surface' | 'width'> & {
	/** The surface of the panel: `flat` is opaque, and `glass` is translucent and blurred. @defaultValue 'flat' */
	surface?: VariantProps<typeof k>['surface']
	/** The maximum width of the panel. @defaultValue 'lg' */
	width?: VariantProps<typeof k>['width']
}
