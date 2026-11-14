/**
 * Omote scrollbar: the scrollbar of a scroll container. `hidden` removes the
 * scrollbar and keeps the scroll, for a strip whose edge fade or whose
 * position already shows the overflow, such as a tab list or a row of
 * thumbnails. `scrollbar-none` hides it in each engine that reads
 * `scrollbar-width`, and the `::-webkit-scrollbar` rule hides it in an older
 * WebKit.
 *
 * Layer: kiso · Concern: scrollbar
 */

export const scrollbar = {
	hidden: ['scrollbar-none', '[&::-webkit-scrollbar]:hidden'],
} as const
