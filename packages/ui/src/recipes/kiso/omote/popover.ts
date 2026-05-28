/**
 * Omote popover — floating popover surface. Translucent fill, ring, and
 * blur compose together as a single chrome.
 *
 * Layer: kiso · Concern: popover surface
 */

import { sen } from '../sen'

import { bg } from './bg'
import { blur } from './blur'

const { ring } = sen

export const popover = [blur.md, bg.popover, ring.default]
