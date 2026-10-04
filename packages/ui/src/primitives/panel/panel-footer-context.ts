'use client'

import { useCallback, useMemo, useState } from 'react'
import { createContext } from '../../core'

type PanelFooterContextValue = {
	/** Called by a mounted Footer slot; the cleanup deregisters. Absent where no default footer listens. */
	register?: () => () => void
	/** `true` while at least one Footer slot of the panel is mounted. */
	registered: boolean
}

/**
 * Tells a panel root that a Footer slot rendered, so the root drops its default
 * footer. `PanelProviders` provides it. The default is inert: a Footer outside
 * a panel registers with nothing.
 *
 * @internal
 */
export const [PanelFooterContext, usePanelFooter] = createContext<PanelFooterContextValue>(
	'PanelFooter',
	{ default: { registered: false } },
)

/**
 * The value for the context around the default footer. It has no `register`,
 * so the Footer slot that the default footer renders does not remove the
 * default footer.
 *
 * @internal
 */
export const DEFAULT_FOOTER_SCOPE: PanelFooterContextValue = { registered: false }

/**
 * Returns the reference-counted value for {@link PanelFooterContext}. A
 * Footer that remounts does not bring the default footer back for a frame.
 *
 * @returns The `{ register, registered }` value of the panel.
 * @internal
 */
export function usePanelFooterValue(): PanelFooterContextValue {
	const [count, setCount] = useState(0)

	const register = useCallback(() => {
		setCount((current) => current + 1)

		return () => setCount((current) => current - 1)
	}, [])

	return useMemo(() => ({ register, registered: count > 0 }), [register, count])
}
