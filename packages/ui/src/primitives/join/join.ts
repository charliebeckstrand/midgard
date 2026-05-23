'use client'

import { createContext } from '../../core'
import type { GroupOrientation, GroupPosition } from '../../recipes'

/**
 * Per-element join position broadcast by `<Group>` (via `useGroup`) to each
 * direct child. Read by `<Placeholder>` so skeleton renders inherit the same
 * end-cap radii and 1 px overlap as the real controls — without each leaf
 * having to forward `data-group` to its placeholder render path.
 */
type JoinContextValue = {
	position: GroupPosition
	orientation: GroupOrientation
}

export const [JoinProvider, useJoin] = createContext<JoinContextValue | null>('Join', {
	default: null,
})
