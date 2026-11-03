'use client'

import { createContext } from '../../core/create-context'
import type { Orientation } from '../../types/orientation'

/** Shared by `<Toolbar>` to its `<ToolbarGroup>`/`<ToolbarSeparator>` descendants. */
export type ToolbarContextValue = {
	orientation: Orientation
}

export const [ToolbarContext, useToolbarContext] = createContext<ToolbarContextValue>('Toolbar')
