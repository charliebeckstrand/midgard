import { maru } from '../maru'
import { take } from '../take'

export const avatar = {
	base: maru.rounded.full,
	size: take.avatar,
	defaults: { size: 'md' as const },
}
