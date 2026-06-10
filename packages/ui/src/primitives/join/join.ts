'use client'

import { createContext } from '../../core'
import type { GroupOrientation, GroupPosition } from '../../recipes'

/**
 * Per-element join position broadcast by `<Group>` (via `useGroup`) to each
 * direct child. `<Placeholder>` reads it; skeleton renders inherit the real
 * controls' end-cap radii and 1 px overlap.
 */
type JoinContextValue = {
	position: GroupPosition
	orientation: GroupOrientation
}

export const [JoinContext, useJoin] = createContext<JoinContextValue | null>('Join', {
	default: null,
})
