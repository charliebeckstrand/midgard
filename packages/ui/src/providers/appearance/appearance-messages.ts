import { defineMessages } from '../../primitives/intl/intl-messages'

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
