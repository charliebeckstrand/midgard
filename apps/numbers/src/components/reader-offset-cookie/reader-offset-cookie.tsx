'use client'

import { useEffect } from 'react'
import { readCookie, writeCookie } from 'ui/core'
import { OFFSET_COOKIE } from '../../utilities/reader-offset'

/**
 * Writes the offset of the time zone of the reader in its cookie after the
 * hydration, so the next render of the server knows the day of the reader. It
 * renders nothing.
 *
 * @remarks
 * Each page of the app writes it, so a reader who signs in already has the
 * cookie. The cookie holds the offset of the last page that hydrated. After a
 * change of the offset, such as the start of daylight saving time or a trip to
 * a new time zone, the next request still has the old offset. Near midnight,
 * the day of the server can then differ from the day of the browser, and the
 * notice of a replay can show or close after the hydration.
 */
export function ReaderOffsetCookie() {
	useEffect(() => {
		const offset = String(new Date().getTimezoneOffset())

		if (readCookie(OFFSET_COOKIE) !== offset) writeCookie(OFFSET_COOKIE, offset)
	}, [])

	return null
}
