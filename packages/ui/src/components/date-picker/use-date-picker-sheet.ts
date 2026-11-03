'use client'

import { useMediaQuery } from '../../hooks/use-media-query'
import { PHONE_QUERY } from '../../utilities/media-query'

/**
 * Whether the panel of a {@link DatePicker} opens as a bottom sheet: the
 * `sheet` prop is on, and the viewport is a phone ({@link PHONE_QUERY}).
 *
 * @internal
 */
export function useDatePickerSheet(sheet = true): boolean {
	const phone = useMediaQuery(PHONE_QUERY)

	return sheet && phone
}
