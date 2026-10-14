/**
 * Omote fade: the edge fade of a scroll container. A mask fades the scrolled
 * content itself, so the fade needs no solid color behind the container.
 *
 * `inline` fades a horizontal edge that has content behind it, and `block`
 * fades a vertical edge. The `scroll-fade-inline` and `scroll-fade-block`
 * utilities (`core/scroll/fade.ts`) hold the masks. The scroll position sets
 * the width of each edge fade in each frame, through scroll-driven animations,
 * so the fade needs no script. A browser without scroll-driven animations
 * shows no fade.
 *
 * Layer: kiso · Concern: scroll edge fade
 */

export const fade = {
	inline: ['scroll-fade-inline'],
	block: ['scroll-fade-block'],
} as const
