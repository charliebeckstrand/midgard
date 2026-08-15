import { defineRecipe, type VariantProps } from '../../core/recipe'
import { bridge } from '../katakana'
import { hannou, narabi, omote, sen, ugoki } from '../kiso'
import { panel } from '../kiso/panel'

const { flex } = narabi
const { glass, backdrop } = omote
const { css } = ugoki

/**
 * The height transition, off for the length of a drag.
 *
 * Stated beside the transition it suspends rather than written into the element
 * mid-gesture: one decision in one place, and the panel already carries the
 * attribute family this keys on.
 */
const RESIZING = 'data-resizing:transition-none'
const { surface, layout, grip } = panel

export const k = {
	...bridge.panel(panel, {
		panel: defineRecipe({
			base: [
				...surface.chrome.flat(),
				layout.base,
				'fixed inset-x-0 bottom-0',
				'overflow-hidden',
				'w-full',
			],
			surface: {
				glass: [...glass],
				flat: [...surface.bg],
			},
			// How much of the screen the panel docks over. `auto` grows to its
			// content and stops short of the top edge, which leaves the page behind
			// visible and is what a drawer is for. `half` and `full` fix the height
			// instead, for a panel whose own content scrolls: a detail panel beside
			// the thing it describes, and a form that owns the screen while it is up.
			//
			// `full` squares the top corners, because a rounded corner against the
			// screen edge reads as a panel that failed to reach it.
			//
			// A panel handed a new `height` grows or shrinks into it rather than
			// jumping: the two fixed steps are lengths, which interpolate. `auto` is
			// sized by its content and keeps snapping, since there is no second length
			// to travel to.
			height: {
				auto: 'max-h-[85dvh] rounded-t-xl',
				half: ['h-[50dvh] rounded-t-xl', css.size, css.duration, RESIZING],
				full: ['h-dvh rounded-t-none', css.size, css.duration, RESIZING],
			},
			defaults: { surface: 'flat', height: 'auto' },
		}),
		backdrop: bridge.backdrop(backdrop),
		// The top padding is the panel's inset, and a handle already is one. Under a
		// handle the stock header would sit a whole step below the grip — which is
		// what made the first consumer hand-roll its own header row rather than use
		// this slot.
		title: { extra: ['px-6 pt-6', 'group-data-handle/drawer:pt-0'] },
		description: { extra: 'px-6' },
		footer: { extra: 'px-6 pb-6' },
		body: { extra: [flex.fill, 'overflow-y-auto overscroll-y-contain', 'px-6 last:mb-6'] },
	}),
	/**
	 * The drag handle: a grab area wide enough to aim at, and the bar inside it
	 * the reader actually sees.
	 *
	 * The area is the full width, so the reach is the panel's rather than the
	 * bar's — `hannou.grab` carries the rest, including the `touch-none` that makes
	 * the gesture work at all under a finger.
	 */
	handle: {
		area: [
			flex.row,
			'w-full shrink-0 items-center justify-center',
			// Even top and bottom: the handle is the panel's own inset, so the space
			// under it is what sets the first slot off — a header adding its own on
			// top would read as a gap between the grip and the title.
			'py-3',
			// The handle is the panel's own edge, not one of its slots, so it takes no
			// slot gap — left in the flow it floats a whole step above the first thing
			// under it. The padding above sets it off instead.
			layout.flush,
			...hannou.grab,
			'outline-hidden',
			sen.focus.inset,
		],
		bar: grip.bar.horizontal,
	},
	motion: ugoki.panel.bottom,
}

/** Recipe variant props for the {@link Drawer} panel — its styling axes (`surface`, `height`), for consumers composing custom slots. */
export type DrawerPanelVariants = VariantProps<typeof k.panel>
