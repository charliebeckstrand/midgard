/**
 * Kokkaku skeleton — avatar. Rounded-full silhouette sized by the
 * standard avatar dimension scale.
 *
 * Layer: kiso · Concern: skeleton form · Unit: avatar
 */

import { kasane } from '../kasane'
import { shaku } from '../shaku'

const { rounded } = kasane

export const avatar = {
	base: rounded.full,
	size: shaku.avatar,
	defaults: { size: 'md' as const },
}
