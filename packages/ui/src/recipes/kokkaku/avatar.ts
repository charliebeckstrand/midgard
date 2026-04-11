import { maru } from '../maru'
import { take } from '../take'

export const avatar = {
	base: maru.roundedFull,
	size: take.avatar,
	defaults: { size: 'md' as const },
}
