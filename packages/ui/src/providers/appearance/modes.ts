// No 'use client': the server half of the appearance (`AppearanceScript` and
// the stored choices it reads) takes these lists as plain values.

/** Color theme preference an `<AppearanceProvider>` holds: a fixed theme, or `'system'` to follow the OS. */
export type ThemeMode = 'light' | 'dark' | 'system'

/** Selectable theme modes with display labels, for use in theme pickers. */
export const themeModes: { label: string; value: ThemeMode }[] = [
	{ label: 'Light', value: 'light' },
	{ label: 'Dark', value: 'dark' },
	{ label: 'System', value: 'system' },
]

/**
 * Motion preference an `<AppearanceProvider>` holds: `'system'` follows the
 * platform `prefers-reduced-motion` setting, and `'reduced'` reduces motion on
 * each platform.
 */
export type MotionMode = 'system' | 'reduced'

/** Selectable motion modes with display labels, for use in motion pickers. */
export const motionModes: { label: string; value: MotionMode }[] = [
	{ label: 'System', value: 'system' },
	{ label: 'Reduced', value: 'reduced' },
]

/**
 * Sidebar preference an `<AppearanceProvider>` holds: `'locked'` keeps the
 * sidebar of a `SidebarLayout` inline from `lg` up, and `'offcanvas'` hides it
 * at the start edge, where a pointer that comes near the edge opens it.
 */
export type SidebarMode = 'locked' | 'offcanvas'

/** Selectable sidebar modes with display labels, for use in sidebar pickers. */
export const sidebarModes: { label: string; value: SidebarMode }[] = [
	{ label: 'Locked', value: 'locked' },
	{ label: 'Offcanvas', value: 'offcanvas' },
]
