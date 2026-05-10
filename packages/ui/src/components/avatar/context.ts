import { createContext } from '../../core'
import type { take } from '../../recipes/ryu/take'

type AvatarSize = take.AvatarSize

export const [AvatarSizeProvider, useAvatarSize] = createContext<AvatarSize | null>('AvatarSize', {
	default: null,
})

export const [AvatarGroupSizeProvider, useAvatarGroupSize] = createContext<AvatarSize | null>(
	'AvatarGroupSize',
	{ default: null },
)
