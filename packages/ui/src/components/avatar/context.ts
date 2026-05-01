import { createContext } from 'react'
import type { take } from '../../recipes/ryu/take'

type AvatarSize = take.AvatarSize

export const AvatarSizeContext = createContext<AvatarSize | null>(null)

export const AvatarGroupSizeContext = createContext<AvatarSize | null>(null)
