'use client'

import { useCallback, useMemo } from 'react'
import { createContext } from '../../core'

type PanelCloseContextValue = {
	close: () => void
}

export const [PanelCloseProvider, usePanelCloseContext] =
	createContext<PanelCloseContextValue>('PanelClose')

/** Returns a memoized `{ close }` value for `PanelCloseProvider`, given the root's `onOpenChange`. */
export function usePanelCloseValue(onOpenChange: (open: boolean) => void) {
	const close = useCallback(() => onOpenChange(false), [onOpenChange])

	return useMemo(() => ({ close }), [close])
}
