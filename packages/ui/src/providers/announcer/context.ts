'use client'

import { createContext } from '../../core'

export type Announce = (message: string, options?: { assertive?: boolean }) => void

const noop: Announce = () => {}

/**
 * Imperative screen-reader announcer. Outside an `<AnnouncerProvider>` this is
 * an ambient no-op rather than a crash — wrap the app root once to enable it.
 */
export const [AnnouncerContext, useAnnounce] = createContext<Announce>('AnnouncerProvider', {
	default: noop,
})
