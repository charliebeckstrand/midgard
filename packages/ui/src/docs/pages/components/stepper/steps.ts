import { words } from '../../../data/words.ts'

export const steps = Object.values(
	words('signup-step', { account: 'Account', profile: 'Profile', confirm: 'Confirm' }),
)

export const instructions = Object.values(
	words('signup-instruction', {
		account: 'Enter your email and a password.',
		profile: 'Add your name and a photo.',
		confirm: 'Check your details.',
	}),
)
