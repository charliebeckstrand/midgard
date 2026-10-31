'use client'

import { useCallback, useMemo } from 'react'

/** Returns a memoized `{ close }` value for `PanelCloseContext`, given the root's `onOpenChange`. */
export function usePanelCloseValue(onOpenChange: (open: boolean) => void) {
	const close = useCallback(() => onOpenChange(false), [onOpenChange])

	return useMemo(() => ({ close }), [close])
}
