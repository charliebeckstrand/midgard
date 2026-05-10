'use client'

import { createContext } from '../../core'

/**
 * Ambient flag — true inside `<Glass>`. Form fields and Button switch to the
 * glass variant when no explicit variant is set; surface chrome takes a
 * `glass` prop and consumers pass `useGlass()` through. See `src/CASCADES.md`.
 */
export const [GlassProvider, useGlass] = createContext<boolean>('Glass', { default: false })
