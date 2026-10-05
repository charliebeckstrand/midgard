/**
 * Omote fade: the edge fade of a scroll container. A mask fades the scrolled
 * content itself, so the fade needs no solid color behind the container.
 *
 * `inline` fades a horizontal edge that has content behind it. The
 * `scroll-fade-inline` utility (`core/scroll/fade.ts`) holds the mask. The
 * scroll position sets the width of each edge fade in each frame, through
 * scroll-driven animations, so the fade needs no script. A browser without
 * scroll-driven animations shows no fade.
 *
 * Layer: kiso · Concern: scroll edge fade
 */

export const fade = {
	inline: ['scroll-fade-inline'],
} as const
