import { createContext } from 'react'
import type { take } from '../../recipes/take'

type AvatarSize = take.AvatarSize

export const AvatarSizeContext = createContext<AvatarSize | null>(null)
