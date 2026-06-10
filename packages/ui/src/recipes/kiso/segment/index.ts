/**
 * Segment archetype: the rounded box with a sliding indicator, shared by
 * the standalone `<Segment>` family and `<Tabs variant="segment">`.
 * Exposes control / item / indicator fragments for each kata to spread
 * into its own recipe.
 */

import { control } from './control'
import { indicator } from './indicator'
import { item } from './item'

export const segment = {
	control,
	item,
	indicator,
} as const
