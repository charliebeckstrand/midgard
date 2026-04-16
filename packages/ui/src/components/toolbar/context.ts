'use client'

import { createContext } from '../../core'

export type ToolbarOrientation = 'horizontal' | 'vertical'

export type ToolbarContextValue = {
	orientation: ToolbarOrientation
}

export const [ToolbarProvider, useToolbarContext] = createContext<ToolbarContextValue>('Toolbar')
