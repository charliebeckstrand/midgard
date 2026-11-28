'use client'

import { useSyncExternalStore } from 'react'
import { isApplePlatform } from '../utilities/apple-platform'
import { noopSubscribe } from '../utilities/noop'

/** The server does not know the platform of the reader, so it renders as on Apple. */
const onServer = () => true

/**
 * Whether the reader is on an Apple platform, where `$mod` is ⌘ (Meta) and not
 * Control. The server render and the hydration render give `true`, and the
 * client then gives the real platform.
 *
 * @remarks The gate is its own, not `useHydrated`. On Apple the client value
 * equals the server value, so React skips the render after hydration.
 *
 * @internal
 */
export function useApplePlatform(): boolean {
	return useSyncExternalStore(noopSubscribe, isApplePlatform, onServer)
}
