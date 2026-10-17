import { defineMessages } from 'react-intl'

/**
 * The messages of the copy button: its name before a copy, and the word that
 * the button and the announcer give after a copy.
 *
 * @internal
 */
export const copyButtonMessages = defineMessages({
	copy: {
		id: 'ui.copyButton.copy',
		defaultMessage: 'Copy to clipboard',
		description: 'The name of a button that copies a value to the clipboard.',
	},
	copied: {
		id: 'ui.copyButton.copied',
		defaultMessage: 'Copied',
		description: 'The name of the copy button, and the announcement, after a copy succeeds.',
	},
})
