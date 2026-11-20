'use client'

import { createContext } from '../../core/create-context'
import type { Icons } from './types'

/**
 * The icons that an app registers through `<UIProvider icons>`. Each glyph of
 * `icons.ts` reads it. Defaults to no icons outside any provider, so each
 * glyph draws its Lucide default.
 *
 * @internal
 */
export const [IconsContext] = createContext<Icons>('Icons', { default: {} })
