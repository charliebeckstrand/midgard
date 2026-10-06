/**
 * Ugoki collapse: height reveal for disclosure panels. `fade` crossfades
 * opacity alongside the height change. In `slide`, the content moves down with
 * the panel edge. Each variant clips the panel only while the height moves.
 *
 * Layer: kiso · Concern: collapse motion
 */

import { duration, ease } from './base'

const transition = { duration: duration[200], ease: ease.inOut }

const fade = {
	initial: { height: 0, opacity: 0 },
	animate: { height: 'auto', opacity: 1 },
	exit: { height: 0, opacity: 0 },
	transition,
} as const

const slide = {
	initial: { height: 0 },
	animate: { height: 'auto' },
	exit: { height: 0 },
	transition,
	/**
	 * The motion of the content in the panel. The content moves by its full
	 * height on the same curve as the panel height. The bottom edge of the
	 * content then stays on the bottom edge of the panel.
	 *
	 * The move uses `y`, not `transform`, so that it stays on the main thread.
	 * Only the main thread can move the height, and the two must move on the
	 * same frames.
	 */
	content: {
		initial: { y: '-100%' },
		animate: { y: 0 },
		exit: { y: '-100%' },
		transition,
	},
} as const

/**
 * Adds a clip to the targets of a preset. The panel clips its content from the
 * start of each height change, and a close starts with the clip on. When an open
 * lands, Motion removes the inline overflow, and the stylesheet controls the
 * overflow again. Thus an outline, a ring, or a shadow at the edge of the
 * content shows in full at rest.
 *
 * Motion cannot animate `overflow`, so it sets each value immediately. It
 * applies `transitionEnd` only when all the animations of the target land. A
 * target that a new target stops does not land, so an open that a close stops
 * does not remove the clip of the close. A panel that mounts open starts from
 * `animate` and its `transitionEnd`, so it has no clip.
 */
function clip<P extends { initial: object; animate: object; exit: object }>(preset: P) {
	return {
		...preset,
		initial: { ...preset.initial, overflow: 'hidden' },
		animate: { ...preset.animate, overflow: 'hidden', transitionEnd: { overflow: '' } },
		exit: { ...preset.exit, overflow: 'hidden' },
	} as const
}

/**
 * The variants for a panel with no clip of its own. The panel clips its content
 * only while its height moves. Each target is a module constant, so a
 * comparison by identity holds.
 */
export const collapse = { fade: clip(fade), slide: clip(slide) } as const
