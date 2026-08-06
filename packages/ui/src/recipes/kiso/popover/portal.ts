/**
 * Popover archetype: portal container. Rides the `float` rung, which clears
 * every overlay rung as well as page chrome — a float is routinely raised
 * from inside a modal panel, and must render over it.
 *
 * Layer: kiso · Archetype: popover · Concern: portal
 */

import { sou } from '../sou'

export const portal = sou.float
