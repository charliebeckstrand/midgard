import { words } from '../../../data/words.ts'

export const steps = Object.values(
	words('signup-step', { account: 'Account', profile: 'Profile', confirm: 'Confirm' }),
)
