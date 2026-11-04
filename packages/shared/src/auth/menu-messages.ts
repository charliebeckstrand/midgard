import { defineMessages } from 'ui/primitives/intl'

/**
 * The messages of the user menu items, in the language of the reader. They are
 * not in `authMessages`, because the menu loads with each signed-in page, and
 * these four messages then do not bring the messages of each auth page.
 *
 * @internal
 */
export const menuMessages = defineMessages({
	signOut: {
		id: 'shared.auth.signOut',
		defaultMessage: 'Sign out',
		description: 'The menu item and the button that end the session.',
	},
	verifyMenu: {
		id: 'shared.auth.verifyMenu',
		defaultMessage: 'Verify your email',
		description: 'The user menu item that sends a link to verify the email.',
	},
	verifyMenuSent: {
		id: 'shared.auth.verifyMenuSent',
		defaultMessage: 'Link sent, check your email',
		description: 'The user menu item after it sent the link to verify the email.',
	},
	verifyMenuFailed: {
		id: 'shared.auth.verifyMenuFailed',
		defaultMessage: 'Link not sent, try again later',
		description: 'The user menu item after the link to verify the email did not send.',
	},
})
