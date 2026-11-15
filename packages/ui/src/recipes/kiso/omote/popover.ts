/**
 * Omote popover: floating popover surface. Translucent fill, ring, and
 * blur compose together as a single chrome.
 *
 * Layer: kiso · Concern: popover surface
 */

import { sen } from '../sen'

import { bg } from './bg'

const { ring } = sen

export const popover = ['backdrop-blur-sm', bg.popover, ring.default]
