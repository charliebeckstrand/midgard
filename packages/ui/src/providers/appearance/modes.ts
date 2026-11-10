// No 'use client': the server half of the appearance (the stored choices and
// `appearanceRootClasses`) takes these lists as plain values.

import { defineMessages, intlMessages } from '../../primitives/intl/intl-messages'
import type { MessageDescriptor } from '../../primitives/intl/types'

const modeMessages = defineMessages({
	light: {
		id: 'ui.settings.theme.light',
		defaultMessage: 'Light',
		description: 'A theme with dark text on a light background.',
	},
	dark: {
		id: 'ui.settings.theme.dark',
		defaultMessage: 'Dark',
		description: 'A theme with light text on a dark background.',
	},
	reduced: {
		id: 'ui.settings.motion.reduced',
		defaultMessage: 'Reduced',
		description: 'A motion setting that removes most animation.',
	},
	locked: {
		id: 'ui.settings.sidebar.locked',
		defaultMessage: 'Locked',
		description: 'A sidebar setting that keeps the sidebar on the screen.',
	},
	offcanvas: {
		id: 'ui.settings.sidebar.offcanvas',
		defaultMessage: 'Offcanvas',
		description:
			'A sidebar setting that hides the sidebar at the edge until the pointer comes near.',
	},
	glass: {
		id: 'ui.settings.surfaces.glass',
		defaultMessage: 'Glass',
		description:
			'A surfaces setting that paints dialogs, sheets, and drawers as translucent glass.',
	},
	solid: {
		id: 'ui.settings.surfaces.solid',
		defaultMessage: 'Solid',
		description: 'A surfaces setting that paints dialogs, sheets, and drawers with a flat fill.',
	},
})

/** Color theme preference an `<AppearanceProvider>` holds: a fixed theme, or `'system'` to follow the OS. */
export type ThemeMode = 'light' | 'dark' | 'system'

/**
 * The theme modes, for a theme picker. Each mode has a `message` that names the mode
 * in the language of the reader.
 */
export const themeModes: { message: MessageDescriptor; value: ThemeMode }[] = [
	{ message: modeMessages.light, value: 'light' },
	{ message: modeMessages.dark, value: 'dark' },
	{ message: intlMessages.system, value: 'system' },
]

/**
 * Motion preference an `<AppearanceProvider>` holds: `'system'` follows the
 * platform `prefers-reduced-motion` setting, and `'reduced'` reduces motion on
 * each platform.
 */
export type MotionMode = 'system' | 'reduced'

/**
 * The motion modes, for a motion picker. Each mode has a `message` that names the
 * mode in the language of the reader.
 */
export const motionModes: { message: MessageDescriptor; value: MotionMode }[] = [
	{ message: intlMessages.system, value: 'system' },
	{ message: modeMessages.reduced, value: 'reduced' },
]

/**
 * Sidebar preference an `<AppearanceProvider>` holds: `'locked'` keeps the
 * sidebar of a `SidebarLayout` inline while the layout is inline, and `'offcanvas'` hides it
 * at the start edge, where a pointer that comes near the edge opens it.
 */
export type SidebarMode = 'locked' | 'offcanvas'

/**
 * The sidebar modes, for a sidebar picker. Each mode has a `message` that names
 * the mode in the language of the reader.
 */
export const sidebarModes: { message: MessageDescriptor; value: SidebarMode }[] = [
	{ message: modeMessages.locked, value: 'locked' },
	{ message: modeMessages.offcanvas, value: 'offcanvas' },
]

/**
 * Surfaces preference an `<AppearanceProvider>` holds: `'glass'` paints each
 * Dialog, Drawer, and Sheet panel as glass, and `'solid'` paints each glass
 * surface flat.
 */
export type SurfaceMode = 'glass' | 'solid'

/**
 * The surface modes, for a surfaces picker. Each mode has a `message` that
 * names the mode in the language of the reader.
 */
export const surfaceModes: { message: MessageDescriptor; value: SurfaceMode }[] = [
	{ message: modeMessages.glass, value: 'glass' },
	{ message: modeMessages.solid, value: 'solid' },
]
