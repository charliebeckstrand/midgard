'use client'

import { createContext } from '../../core'
import type { Orientation } from '../../types'

export type ToolbarOrientation = Orientation

export type ToolbarContextValue = {
	orientation: ToolbarOrientation
}

export const [ToolbarProvider, useToolbarContext] = createContext<ToolbarContextValue>('Toolbar')
