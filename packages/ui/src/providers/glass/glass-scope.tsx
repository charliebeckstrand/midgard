'use client'

import type { ReactNode } from 'react'
import { GlassContext } from './context'

/**
 * Client leaf that writes the ambient glass flag for its subtree. A context
 * provider needs a client module. Thus {@link GlassProvider} stays free of a
 * directive and renders this leaf.
 *
 * @internal
 */
export function GlassScope({ children }: { children: ReactNode }) {
	return <GlassContext value={true}>{children}</GlassContext>
}
