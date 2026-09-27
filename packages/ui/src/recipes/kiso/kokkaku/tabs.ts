/**
 * Kokkaku skeleton: tabs. One tab line per size step at the tab's text
 * line height; the bottom margin mirrors the tab's padding above the
 * list rail. Tab count comes from the composing skeleton.
 *
 * Each step is a stepped `density-*` class, so the silhouette takes the
 * step of its nearest density scope, as the tab does.
 *
 * Layer: kiso · Concern: skeleton form · Unit: tabs
 */

export const tabs = {
	tab: 'density-mb-[3,4,5] density-h-[5,6,7] density-w-[14,16,20]',
} as const
