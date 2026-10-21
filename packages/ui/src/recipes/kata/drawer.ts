/**
 * Drawer kata: the unit of the `<Drawer>` bottom panel, which extends the panel
 * group. The `base` slot is the panel, with the `surface` and `height` axes.
 * The `backdrop` follows the glass or flat surface. The `handle` drag grip and
 * the `motion` are extras.
 */
import { defineScale } from '../../core/density'
import { defineKata, type VariantProps } from '../../core/recipe'
import { dan, narabi, ugoki } from '../kiso'
import { gap, grip, inset, panel } from '../kumi/panel'

const { flex } = narabi
const { css } = ugoki

/**
 * The height transition, off for the length of a drag.
 *
 * Stated beside the transition it suspends, rather than written into the element
 * mid-gesture. That is one decision in one place, and the panel already carries
 * the attribute family this keys on.
 */
const RESIZING = 'data-resizing:transition-none'

/** Rounded top corners, square while the panel stands at the screen edge (`data-full`). */
const SQUARE_AT_EDGE = 'rounded-t-xl data-full:rounded-t-none'

export const k = defineKata(
	{
		extends: panel,
		base: [
			// The panel sits on the bottom edge of the overlay root. Each height below
			// is a share of the root, so a panel in a scoped overlay fits its container.
			'absolute inset-x-0 bottom-0',
			// In a page with `viewport-fit=cover`, this keeps the footer clear of the
			// home indicator. Elsewhere the inset is zero.
			'pb-[env(safe-area-inset-bottom)]',
			'overflow-hidden',
			'w-full',
		],
		// How much of the screen the panel docks over. `auto` and `fit` grow to
		// their content; `half` and `full` fix the height instead, for a panel whose
		// own content scrolls: a detail panel beside the thing it describes, and a
		// form that owns the screen while it is up.
		//
		// The two grown steps differ in where they stop. `auto` stops short of the
		// top edge, which leaves the page behind visible and is what a drawer is
		// for. `fit` goes to the screen, for a panel the reader navigates within:
		// a step whose content runs long is a panel that has to hold it, and one
		// clamped short of the edge would strand the last of it behind a scroll the
		// screen had room for.
		//
		// `full` and `fit` square the top corners against the screen edge, because
		// a rounded corner there reads as a panel that failed to reach it: `full`
		// at rest, `fit` on the steps that stand it there, and either fixed step once
		// a drag leaves it at the ceiling. `auto` never reaches the edge, so it never
		// squares.
		//
		// A panel handed a new fixed `height` grows or shrinks into it rather than
		// jumping: the two fixed steps are lengths, which interpolate. A grown one
		// has no second length, so nothing here can move it. `fit` hands that to
		// `usePanelFit`, which measures the length and travels it under Framer
		// Motion; `auto` snaps.
		height: {
			auto: 'max-h-[85%] rounded-t-xl',
			fit: ['max-h-full', SQUARE_AT_EDGE, css.corner, css.duration],
			half: ['h-1/2', SQUARE_AT_EDGE, css.size, css.duration, RESIZING],
			full: ['h-full', SQUARE_AT_EDGE, css.size, css.duration, RESIZING],
		},
		slots: {
			// The top padding is the panel's inset, and a handle already is one. Under a
			// handle the stock header would sit a whole step below the grip, which is
			// what made the first consumer hand-roll its own header row rather than use
			// this slot.
			title: [inset.x, inset.top, 'group-data-handle/drawer:pt-0'],
			description: inset.x,
			footer: [inset.x, inset.bottom],
			body: [
				flex.fill,
				'overflow-y-auto overscroll-y-contain',
				inset.x,
				inset.first.drawer,
				inset.last.drawer,
			],
			/**
			 * The optional wrapper around the body and the footer. `half` and `full` fix
			 * the height of the panel. The wrapper fills that height, so the body can
			 * grow and the footer stays at the foot of the panel.
			 */
			content: flex.fill,
		},
		defaults: { height: 'auto' },
	},
	{
		/**
		 * The drag handle: a grab area wide enough to aim at (`base`), and the bar
		 * that it draws as its `::after`, which the reader actually sees (`bar`).
		 *
		 * The grab area is the full width, so the reach is the panel's rather than the
		 * bar's. `grip.area` carries the rest.
		 */
		handle: {
			base: [
				flex.row,
				'w-full shrink-0',
				// Even top and bottom: the handle is the panel's own inset, so the space
				// under it is what sets the first slot off (a header adding its own on
				// top would read as a gap between the grip and the title).
				'py-3',
				// The handle is the panel's own edge, not one of its slots, so it takes no
				// slot gap: left in the flow it floats a whole step above the first thing
				// under it. The padding above sets it off instead.
				gap.flush,
				...grip.area,
			],
			bar: grip.bar.horizontal,
		},
		motion: ugoki.panel.bottom,
		/** The motion under reduced motion: the panel shows with no slide. */
		still: ugoki.still(ugoki.panel.bottom),
		/**
		 * The travel a `fit` panel makes between two content heights, for
		 * {@link usePanelFit}. Named here rather than in the hook, because the tempo a
		 * unit moves on is the kata's to state.
		 */
		fit: ugoki.spring.fit,
	},
)

/** Recipe variant props for the {@link Drawer} panel: its styling axes (`surface`, `height`), for consumers composing custom slots. */
export type DrawerPanelVariants = Omit<VariantProps<typeof k>, 'surface' | 'height'> & {
	/** The surface of the panel: `flat` is opaque, and `glass` is translucent and blurred. @defaultValue 'flat' */
	surface?: VariantProps<typeof k>['surface']
	/**
	 * How far up the screen the panel reaches. `auto` and `fit` grow with the
	 * content, and `half` and `full` fix the height.
	 * @defaultValue 'auto'
	 */
	height?: VariantProps<typeof k>['height']
}

/** The size scale of {@link Drawer}: the steps of the panel title, which the drawer writes as a density scope. */
export const scale = defineScale(dan.text.title)
