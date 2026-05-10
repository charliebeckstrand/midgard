import { createContext } from '../../core'
import type { take } from '../../recipes/ryu/take'

type AvatarSize = take.AvatarSize

/**
 * Avatar family size cascade. AvatarGroup broadcasts its size to nested
 * Avatars; Avatar broadcasts its size so a placed StatusDot inherits.
 * See `src/CASCADES.md`.
 */
export const [AvatarSizeProvider, useAvatarSize] = createContext<AvatarSize | null>('AvatarSize', {
	default: null,
})

export const [AvatarGroupSizeProvider, useAvatarGroupSize] = createContext<AvatarSize | null>(
	'AvatarGroupSize',
	{ default: null },
)
