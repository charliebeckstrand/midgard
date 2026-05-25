'use client'

import { createContext } from '../../core'
import type { ToolbarOrientation } from './types'

export type ToolbarContextValue = {
	orientation: ToolbarOrientation
}

export const [ToolbarContext, useToolbarContext] = createContext<ToolbarContextValue>('Toolbar')
