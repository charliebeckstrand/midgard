'use client'

import { useEffect, useRef } from 'react'
import { takeLinkToken } from './link-token'

/**
 * The token of the emailed link that opened the page, for an event handler.
 * The page takes the token when it mounts ({@link takeLinkToken}), so the
 * token leaves the address bar before the user acts. A reload then has no
 * token, and the user opens the link again.
 *
 * @internal
 * @returns A function that gives the token, or `''` when the link has none.
 */
export function useLinkToken(): () => string {
	const token = useRef('')

	// A second run of the effect, such as in Strict Mode, keeps the token of
	// the first run, because the address bar no longer holds it.
	useEffect(() => {
		token.current ||= takeLinkToken()
	}, [])

	return () => token.current
}
