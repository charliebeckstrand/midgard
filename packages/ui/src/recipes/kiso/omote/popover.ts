/**
 * Omote popover: floating popover surface. Translucent fill, ring, and
 * blur compose together as a single chrome. The ring is a box-shadow, which
 * forced colors remove, so an outline keeps the edge there.
 *
 * Layer: kiso · Concern: popover surface
 */

import { sen } from '../sen'

import { bg } from './bg'
import { blur } from './blur'

const { ring, forced } = sen

export const popover = [blur.md, bg.popover, ring.default, forced.outline]
