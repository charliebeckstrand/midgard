'use client'

import { useCallback, useMemo } from 'react'
import { createContext } from '../../core'

type PanelCloseContextValue = {
	close: () => void
}

export const [PanelCloseContext, usePanelCloseContext] = createContext<PanelCloseContextValue>(
	'PanelClose',
	{ error: 'PanelClose must be rendered inside a Dialog, Sheet, or Drawer' },
)

/** Returns a memoized `{ close }` value for `PanelCloseContext`, given the root's `onOpenChange`. */
export function usePanelCloseValue(onOpenChange: (open: boolean) => void) {
	const close = useCallback(() => onOpenChange(false), [onOpenChange])

	return useMemo(() => ({ close }), [close])
}
