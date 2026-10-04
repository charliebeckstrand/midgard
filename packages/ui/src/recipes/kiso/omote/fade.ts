/**
 * Omote fade: the edge fade of a scroll container. A mask fades the scrolled
 * content itself, so the fade needs no solid color behind the container.
 *
 * `inline` fades a horizontal edge that has content behind it. The
 * `scroll-fade-inline` utility (`core/scroll/fade.ts`) holds the mask. Where
 * the browser supports scroll-driven animations, the scroll position sets the
 * width of each edge fade in each frame. Elsewhere, the fade keys off the
 * `data-overflow-start` / `data-overflow-end` attributes that
 * `useScrollOverflow({ axis: 'horizontal' })` stamps.
 *
 * Layer: kiso · Concern: scroll edge fade
 */

export const fade = {
	inline: ['scroll-fade-inline'],
} as const
