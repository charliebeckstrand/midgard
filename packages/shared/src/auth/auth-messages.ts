import { defineMessage, defineMessages, type TypedMessageDescriptor } from 'ui/primitives/intl'

/**
 * The messages of the auth pages, the second step, and the user menu items, in
 * the language of the reader. A message of the gateway, such as the reason for
 * a failed sign-in, stays as the gateway words it, and these are the fallbacks.
 *
 * @internal
 */
export const authMessages = defineMessages({
	email: {
		id: 'shared.auth.email',
		defaultMessage: 'Email',
		description: 'The label of the email field of an auth form.',
	},
	password: {
		id: 'shared.auth.password',
		defaultMessage: 'Password',
		description: 'The label of the password field of an auth form.',
	},
	confirmPassword: {
		id: 'shared.auth.confirmPassword',
		defaultMessage: 'Confirm password',
		description: 'The label of the field that repeats the new password.',
	},
	signIn: {
		id: 'shared.auth.signIn',
		defaultMessage: 'Sign in',
		description: 'The button that signs in, and the link to the sign-in page.',
	},
	signOut: {
		id: 'shared.auth.signOut',
		defaultMessage: 'Sign out',
		description: 'The menu item and the button that end the session.',
	},
	continue: {
		id: 'shared.auth.continue',
		defaultMessage: 'Continue',
		description: 'The button or the link that goes to the next step after a success.',
	},
	cancel: {
		id: 'shared.auth.cancel',
		defaultMessage: 'Cancel',
		description: 'The button that closes the dialog of the second step.',
	},
	unexpected: {
		id: 'shared.auth.unexpected',
		defaultMessage: 'An unexpected error occurred. Please try again later.',
		description: 'The error of an auth request that fails, such as on a network failure.',
	},
	confirmIdentity: {
		id: 'shared.auth.confirmIdentity',
		defaultMessage: 'Confirm that it is you',
		description: 'The title of the second step of a sign-in.',
	},
	loginTitle: {
		id: 'shared.auth.loginTitle',
		defaultMessage: 'Sign in to your account',
		description: 'The title of the sign-in page.',
	},
	loginFailed: {
		id: 'shared.auth.loginFailed',
		defaultMessage: 'Login failed. Please check your credentials and try again.',
		description: 'The error of a sign-in that the gateway refused without a reason.',
	},
	passkeySignInFailed: {
		id: 'shared.auth.passkeySignInFailed',
		defaultMessage: 'Passkey sign-in did not complete. Please try again.',
		description: 'The error of a passkey sign-in that the reader or the browser stopped.',
	},
	oauthFailed: {
		id: 'shared.auth.oauthFailed',
		defaultMessage: 'That sign-in did not complete. Please try again.',
		description: 'The error of a GitHub or Google sign-in that did not complete.',
	},
	oauthUnavailable: {
		id: 'shared.auth.oauthUnavailable',
		defaultMessage: 'That sign-in method is not available.',
		description: 'The error of a GitHub or Google sign-in that the gateway does not offer.',
	},
	emailUnverified: {
		id: 'shared.auth.emailUnverified',
		defaultMessage: 'That account has no verified email. Verify it with the provider first.',
		description:
			'The error of a GitHub or Google sign-in with an account whose email is not verified.',
	},
	accountExists: {
		id: 'shared.auth.accountExists',
		defaultMessage:
			'An account with that email already exists. Sign in with it, then connect this account from the account page.',
		description:
			'The error of a GitHub or Google sign-in whose email belongs to another account of the app.',
	},
	accountInactive: {
		id: 'shared.auth.accountInactive',
		defaultMessage: 'Account is inactive.',
		description: 'The error of a sign-in with an account that an admin turned off.',
	},
	expired: {
		id: 'shared.auth.expired',
		defaultMessage: 'Too many wrong tries. Please sign in again.',
		description:
			'The notice after the gateway ended a session for too many wrong second-step tries.',
	},
	passwordSet: {
		id: 'shared.auth.passwordSet',
		defaultMessage: 'Your password is set. Please sign in.',
		description: 'The notice on the sign-in page after a password reset.',
	},
	registered: {
		id: 'shared.auth.registered',
		defaultMessage: 'Check your email to finish signing up, then sign in.',
		description: 'The notice on the sign-in page after a registration.',
	},
	forgotPassword: {
		id: 'shared.auth.forgotPassword',
		defaultMessage: 'Forgot password?',
		description: 'The link to the page that sends a link to reset the password.',
	},
	signInWithPasskey: {
		id: 'shared.auth.signInWithPasskey',
		defaultMessage: 'Sign in with a passkey',
		description: 'The button that signs in with a passkey.',
	},
	noAccount: {
		id: 'shared.auth.noAccount',
		defaultMessage: "Don't have an account?",
		description: 'The text before the link to the register page.',
	},
	createOne: {
		id: 'shared.auth.createOne',
		defaultMessage: 'Create one',
		description: 'The link to the register page, after "Don\'t have an account?".',
	},
	registerTitle: {
		id: 'shared.auth.registerTitle',
		defaultMessage: 'Create your account',
		description: 'The title of the register page.',
	},
	fullName: {
		id: 'shared.auth.fullName',
		defaultMessage: 'Full name',
		description: 'The label of the name field of the register page.',
	},
	createAccount: {
		id: 'shared.auth.createAccount',
		defaultMessage: 'Create account',
		description: 'The button that registers a new account.',
	},
	registrationFailed: {
		id: 'shared.auth.registrationFailed',
		defaultMessage: 'Registration failed. Please check your details and try again.',
		description: 'The error of a registration that the gateway refused without a reason.',
	},
	haveAccount: {
		id: 'shared.auth.haveAccount',
		defaultMessage: 'Already have an account?',
		description: 'The text before the link to the sign-in page.',
	},
	forgotTitle: {
		id: 'shared.auth.forgotTitle',
		defaultMessage: 'Reset your password',
		description: 'The title of the page that sends a link to reset the password.',
	},
	forgotIntro: {
		id: 'shared.auth.forgotIntro',
		defaultMessage:
			'Type the email of your account. We will send you a link to set a new password.',
		description: 'The text of the page that sends a link to reset the password.',
	},
	forgotSent: {
		id: 'shared.auth.forgotSent',
		defaultMessage: 'If an account has that email, we sent it a link. The link works for one hour.',
		description: 'The notice after the page sent a link to reset the password.',
	},
	sendLink: {
		id: 'shared.auth.sendLink',
		defaultMessage: 'Send link',
		description: 'The button that sends a link to reset the password.',
	},
	sendAnotherLink: {
		id: 'shared.auth.sendAnotherLink',
		defaultMessage: 'Send another link',
		description: 'The button that sends the link to reset the password again.',
	},
	backToSignIn: {
		id: 'shared.auth.backToSignIn',
		defaultMessage: 'Back to sign in',
		description: 'The link back to the sign-in page.',
	},
	requestFailed: {
		id: 'shared.auth.requestFailed',
		defaultMessage: 'The request failed. Please try again.',
		description:
			'The error of a request for a reset link that the gateway refused without a reason.',
	},
	resetTitle: {
		id: 'shared.auth.resetTitle',
		defaultMessage: 'Choose a new password',
		description: 'The title of the page that sets a new password from a reset link.',
	},
	newPassword: {
		id: 'shared.auth.newPassword',
		defaultMessage: 'New password',
		description: 'The label of the new password field.',
	},
	setPassword: {
		id: 'shared.auth.setPassword',
		defaultMessage: 'Set password',
		description: 'The button that sets the new password.',
	},
	resetFailed: {
		id: 'shared.auth.resetFailed',
		defaultMessage: 'The password did not change. Please try again.',
		description: 'The error of a password reset that the gateway refused without a reason.',
	},
	linkExpired: {
		id: 'shared.auth.linkExpired',
		defaultMessage: 'Link expired?',
		description: 'The text before the link to get a new reset link.',
	},
	getNewLink: {
		id: 'shared.auth.getNewLink',
		defaultMessage: 'Get a new one',
		description: 'The link to get a new reset link, after "Link expired?".',
	},
	verifyTitle: {
		id: 'shared.auth.verifyTitle',
		defaultMessage: 'Verify your email',
		description: 'The title of the page that verifies an email from a link.',
	},
	verified: {
		id: 'shared.auth.verified',
		defaultMessage: 'Your email is verified.',
		description: 'The notice after the page verified the email.',
	},
	verifyEmail: {
		id: 'shared.auth.verifyEmail',
		defaultMessage: 'Verify email',
		description: 'The button that verifies the email from the link.',
	},
	verifyFailed: {
		id: 'shared.auth.verifyFailed',
		defaultMessage: 'The email was not verified. Please try again.',
		description: 'The error of an email verification that the gateway refused without a reason.',
	},
	passkeyCheckFailed: {
		id: 'shared.auth.passkeyCheckFailed',
		defaultMessage: 'The passkey check did not complete. Please try again.',
		description: 'The error of a passkey second step that the reader or the browser stopped.',
	},
	codeRejected: {
		id: 'shared.auth.codeRejected',
		defaultMessage: 'That code was not accepted. Please try again.',
		description: 'The error of a second-step code that the gateway refused without a reason.',
	},
	recoveryCode: {
		id: 'shared.auth.recoveryCode',
		defaultMessage: 'Recovery code',
		description: 'The label of the recovery code field of the second step.',
	},
	authenticatorCode: {
		id: 'shared.auth.authenticatorCode',
		defaultMessage: 'Code from your authenticator app',
		description: 'The label of the authenticator code field of the second step.',
	},
	usePasskey: {
		id: 'shared.auth.usePasskey',
		defaultMessage: 'Use a passkey',
		description: 'The button that gives the second step with a passkey.',
	},
	useRecoveryCode: {
		id: 'shared.auth.useRecoveryCode',
		defaultMessage: 'Use a recovery code',
		description: 'The button that switches the second step to a recovery code.',
	},
	useAuthenticator: {
		id: 'shared.auth.useAuthenticator',
		defaultMessage: 'Use your authenticator app',
		description: 'The button that switches the second step to an authenticator code.',
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

/**
 * The name of the button that signs in with a provider, such as "Continue with
 * GitHub". It takes the `provider` name.
 *
 * @internal
 */
export const continueWithMessage: TypedMessageDescriptor<{ provider: string }> = defineMessage<{
	provider: string
}>({
	id: 'shared.auth.continueWith',
	defaultMessage: 'Continue with {provider}',
	description: 'The button that signs in with a provider. The provider is a name, such as GitHub.',
})
