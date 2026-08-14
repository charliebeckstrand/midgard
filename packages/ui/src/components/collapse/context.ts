'use client'

import { createContext } from '../../core'
import type { A11yDisclosure } from '../../hooks/a11y/use-a11y-disclosure'
import type { Mount } from '../../primitives/mount'

type CollapseAnimation = boolean | 'fade' | 'slide'

type CollapseContextValue = {
	open: boolean
	toggle: () => void
	animate: CollapseAnimation
	mount: Mount
	/** The root's arrival callback, raised by the panel that owns the motion. */
	onOpenComplete?: () => void
	triggerProps: A11yDisclosure['triggerProps']
	panelProps: A11yDisclosure['panelProps']
}

/**
 * Reads the enclosing {@link Collapse} state: its open flag and `toggle`, the resolved
 * `animate` and `mount` policies, the root's arrival callback, and the a11y
 * `triggerProps`/`panelProps` wiring.
 *
 * @remarks
 * Must be called inside `<Collapse>`; throws otherwise. Powers `<CollapseTrigger>`
 * and `<CollapsePanel>`, and is exposed for custom trigger/panel compositions.
 */
export const [CollapseContext, useCollapseContext] = createContext<CollapseContextValue>('Collapse')
