'use client'

import { createContext } from '../../core'

/** Returns true inside a Glass subtree. */
export const [GlassProvider, useGlass] = createContext<boolean>('Glass', { default: false })
