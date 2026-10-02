/**
 * Kokkaku skeleton: tabs. One tab line per orientation at the tab's text
 * line height. The tab count comes from the composing skeleton.
 *
 * A horizontal line takes a bottom margin that mirrors the bottom padding of
 * the tab above the list rail. `gap` keeps the horizontal lines apart. The real
 * list has no gap, because the inline padding of each tab keeps the labels
 * apart. The skeleton has no padding, so a small gap does this work.
 *
 * A vertical line takes margins that mirror the padding of a vertical tab on
 * each side, so the lines stack at the pitch of the real tabs and stand off the
 * rail as the labels do.
 *
 * Each step is a stepped `density-*` class, so the silhouette takes the
 * step of its nearest density scope, as the tab does.
 *
 * Layer: kiso · Concern: skeleton form · Unit: tabs
 */

const line = 'density-h-[5,6,7] density-w-[14,16,20]'

export const tabs = {
	tab: {
		horizontal: ['density-mb-[3,4,5]', line],
		vertical: ['density-ms-[3,4,5] density-me-[3,4,5] density-my-[1.5,2,2.5]', line],
	},
	gap: 'density-gap-[1,2,3]',
} as const
