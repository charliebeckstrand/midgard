import { take } from '../take'

export const avatar = {
	base: 'rounded-full',
	size: take.avatar,
	defaults: { size: 'md' as const },
}
