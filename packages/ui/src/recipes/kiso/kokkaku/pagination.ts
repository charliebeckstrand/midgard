/**
 * Kokkaku skeleton: pagination. One page-button square (`min-w-9` plus
 * `p-2` chrome resolves to 9 units); button count comes from the
 * composing skeleton.
 *
 * Layer: kiso · Concern: skeleton form · Unit: pagination
 */

import { kasane } from '../kasane'

const { rounded } = kasane

export const pagination = {
	item: [rounded.lg, 'size-9'],
} as const
