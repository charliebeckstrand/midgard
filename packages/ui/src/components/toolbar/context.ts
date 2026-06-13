'use client'

import { createContext } from '../../core'
import type { ToolbarOrientation } from './types'

/** Shared by `<Toolbar>` to its `<ToolbarGroup>`/`<ToolbarSeparator>` descendants. */
export type ToolbarContextValue = {
	orientation: ToolbarOrientation
}

export const [ToolbarContext, useToolbarContext] = createContext<ToolbarContextValue>('Toolbar')
