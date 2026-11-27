import type { AlertVariants } from '../../recipes/kata/alert'

/** Semantic kind of an alert; selects its default color, icon, and ARIA live role. */
export type AlertSeverity = 'info' | 'success' | 'warning' | 'error'

/** The palette color of each severity. Toast reads it too, so the two stay one palette. @internal */
export const severityColors = {
	info: 'blue',
	success: 'green',
	warning: 'amber',
	error: 'red',
} satisfies Record<AlertSeverity, NonNullable<AlertVariants['color']>>
