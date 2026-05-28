/**
 * Kokkaku skeleton — avatar. Rounded-full silhouette sized by the
 * standard avatar dimension scale.
 *
 * Layer: kiso · Concern: skeleton form · Unit: avatar
 */

import { shaku } from '../shaku'

export const avatar = {
	base: 'rounded-full',
	size: shaku.avatar,
	defaults: { size: 'md' as const },
}
