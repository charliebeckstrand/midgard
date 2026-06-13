'use client'

import { createContext } from '../../core'
import type { A11yDisclosure } from '../../hooks/a11y/use-a11y-disclosure'

type CollapseAnimation = boolean | 'fade' | 'slide'

type CollapseContextValue = {
	open: boolean
	toggle: () => void
	animate: CollapseAnimation
	triggerProps: A11yDisclosure['triggerProps']
	panelProps: A11yDisclosure['panelProps']
}

/**
 * Reads the enclosing {@link Collapse} state: `open`, a `toggle` callback, the
 * resolved `animate` setting, and the a11y `triggerProps`/`panelProps` wiring.
 *
 * @remarks
 * Must be called inside `<Collapse>`; throws otherwise. Powers `<CollapseTrigger>`
 * and `<CollapsePanel>`, and is exposed for custom trigger/panel compositions.
 */
export const [CollapseContext, useCollapseContext] = createContext<CollapseContextValue>('Collapse')
