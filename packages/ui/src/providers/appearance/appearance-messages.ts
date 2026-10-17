import { defineMessages, type MessageDescriptor } from 'react-intl'
import { intlMessages } from '../../primitives/intl/intl-messages'
import type { DensityLevel } from '../density/context'
import type { MotionMode, SidebarMode, ThemeMode } from './modes'

/**
 * The messages of the settings dialog: its title and the label of each picker.
 *
 * @internal
 */
export const appearanceMessages = defineMessages({
	settings: {
		id: 'ui.settings.title',
		defaultMessage: 'Settings',
		description: 'The title of the settings dialog, and the name of the button that opens it.',
	},
	appearance: {
		id: 'ui.settings.appearance',
		defaultMessage: 'Appearance',
		description: 'The label of the picker for the light or dark theme.',
	},
	density: {
		id: 'ui.settings.density',
		defaultMessage: 'Density',
		description: 'The label of the picker for the spacing of the interface.',
	},
	motion: {
		id: 'ui.settings.motion',
		defaultMessage: 'Motion',
		description: 'The label of the picker for animation.',
	},
	sidebar: {
		id: 'ui.settings.sidebar',
		defaultMessage: 'Sidebar',
		description: 'The label of the picker for the behavior of the sidebar.',
	},
	language: {
		id: 'ui.settings.language',
		defaultMessage: 'Language',
		description: 'The label of the picker for the language and the formats of the interface.',
	},
})

const choiceMessages = defineMessages({
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
	loose: {
		id: 'ui.settings.density.loose',
		defaultMessage: 'Loose',
		description: 'The density with the most space between items.',
	},
	snug: {
		id: 'ui.settings.density.snug',
		defaultMessage: 'Snug',
		description: 'The usual density.',
	},
	compact: {
		id: 'ui.settings.density.compact',
		defaultMessage: 'Compact',
		description: 'The density with the least space between items.',
	},
})

/**
 * The message of each choice of the settings pickers, keyed by the value of
 * the choice.
 *
 * @internal
 */
export const appearanceChoiceMessages: Record<
	ThemeMode | MotionMode | SidebarMode | DensityLevel,
	MessageDescriptor
> = { ...choiceMessages, system: intlMessages.system }
