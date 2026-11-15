import { defineKata, type VariantProps } from '../../core/recipe'
import { dan, shaku, ugoki } from '../kiso'
import { panel } from '../kumi/panel'

const { space } = dan
const { popover, css } = ugoki

/**
 * The tallest a floating panel is drawn at: the box of the overlay, less the
 * inset of 1rem on each edge that the panel floats on.
 */
const FLOATING_CAP = 'max-h-[calc(100%-2rem)]'

/**
 * The cap of a `fit` panel in each `align`. A `fit` panel goes up to the edge
 * of its insets when its content asks for that much, as a `fit` Drawer does. A
 * docked panel then meets the top edge of the screen, so it squares its top
 * corners while it stands there (`data-full`). A floating panel already stops
 * 1rem short of each edge, so it keeps its corners. The rules of the three
 * aligns write the same properties, so a breakpoint replaces each one.
 */
const FIT = [
	{
		height: 'fit',
		align: 'bottom',
		class: ['max-h-full data-full:rounded-t-none', css.corner, css.duration],
	},
	{
		height: 'fit',
		align: 'center',
		class: [`${FLOATING_CAP} data-full:rounded-t-2xl`, css.corner, css.duration],
	},
	{
		height: 'fit',
		align: 'top',
		class: [`${FLOATING_CAP} data-full:rounded-t-2xl`, css.corner, css.duration],
	},
]

/**
 * The panel of a `center` or a `top` align, which floats 1rem in from each
 * edge of the box of the overlay. The margins of the align place it in the
 * height between the insets.
 */
const floating = `inset-4 rounded-t-2xl rounded-b-2xl ${FLOATING_CAP} overflow-y-visible overscroll-auto [--ui-panel-safe:0px]`

/**
 * The unit of the {@link Dialog}: the panel (`base`) and the backdrop.
 */
export const k = defineKata(
	{
		extends: panel,
		base: [
			// The panel places itself in the box of the overlay, as a sheet and a
			// drawer do. Its insets and its margins come from the `align` table. It
			// takes the width between its insets, up to the `width` step, and the
			// height of its content, up to the cap of the align.
			'absolute',
			'mx-auto',
			'h-fit',
			space.panel.x,
			space.panel.top,
			// The bottom padding. On the bottom edge, the `align` table also adds the
			// inset of the home indicator in a page with `viewport-fit=cover`.
			space.panel.safe,
		],
		/** The maximum width of the panel. */
		width: shaku.panel,
		/**
		 * How the panel takes the height of its content. The `compound` rules give
		 * `fit` its cap in each `align`.
		 */
		height: { auto: [], fit: [] },
		/**
		 * The classes of each `align` of the panel. Each value writes the same properties, so a breakpoint replaces each one.
		 * `bottom` docks the panel to the bottom edge as a sheet: it spans the
		 * width, rounds its top corners only, and scrolls past 85% of the height.
		 * `center` and `top` float it with an inset of 1rem on each edge, so its
		 * full height stops 1rem short of each. The vertical margins put the panel
		 * at the foot, in the middle, or at the top of the height between the insets.
		 */
		responsive: {
			align: {
				bottom:
					'inset-0 mt-auto mb-0 rounded-t-2xl rounded-b-none max-h-[85%] overflow-y-auto overscroll-contain [--ui-panel-safe:env(safe-area-inset-bottom)]',
				center: `${floating} mt-auto mb-auto`,
				top: `${floating} mt-0 mb-auto`,
			},
		},
		compound: FIT,
		defaults: { width: 'lg', height: 'auto' },
	},
	{
		/** The motion of a floating panel (`desktop`) and of a panel on the bottom edge (`mobile`). */
		motion: { desktop: popover, mobile: ugoki.panel.bottom },
		/**
		 * The motion under reduced motion: the panel on the bottom edge shows with no
		 * slide. The fade of a floating panel moves no box, so it stays as it is.
		 */
		still: { desktop: popover, mobile: ugoki.still(ugoki.panel.bottom) },
		/**
		 * The travel of a `fit` panel between two content heights, for
		 * {@link usePanelFit}. It is the tempo of the `fit` Drawer.
		 */
		fit: ugoki.spring.fit,
	},
)

/** Recipe variant props for the {@link Dialog} panel: its styling axes (`surface`, `width`), for consumers composing custom slots. */
export type DialogPanelVariants = Omit<
	VariantProps<typeof k>,
	'surface' | 'width' | 'align' | 'height'
> & {
	/** The surface of the panel: `flat` is opaque, and `glass` is translucent and blurred. @defaultValue 'flat' */
	surface?: VariantProps<typeof k>['surface']
	/** The maximum width of the panel. @defaultValue 'lg' */
	width?: VariantProps<typeof k>['width']
}
