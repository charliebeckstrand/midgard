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

import { dan } from '../dan'

const line = `${dan.size.row} ${dan.size.tab.width}`

export const tabs = {
	tab: {
		horizontal: [dan.space.tab.skeleton.bottom, line],
		vertical: [
			`${dan.space.tab.skeleton.start} ${dan.space.tab.skeleton.end} ${dan.space.tab.skeleton.y}`,
			line,
		],
	},
	gap: dan.gap.default,
} as const
