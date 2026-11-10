/**
 * Omote popover: floating popover surface. Translucent fill, ring, and
 * blur compose together as a single chrome.
 *
 * Inside a glass panel (an ancestor with `data-glass`), the fill is opaque.
 * The glass panel has a `backdrop-filter`, and Chromium and WebKit then give
 * the blur of a descendant nothing to blur. The translucent fill would show the
 * content behind the popover as it is, such as the fields of a dialog.
 *
 * Layer: kiso · Concern: popover surface
 */

import { mode } from '../../../core/recipe'

import { sen } from '../sen'

import { bg } from './bg'
import { blur } from './blur'

const { ring } = sen

/** The opaque fill of a popover inside a glass panel: the colors of `bg.popover`, at full alpha. */
const inGlass = mode('in-data-glass:bg-white', 'dark:in-data-glass:bg-zinc-800')

export const popover = [blur.md, bg.popover, inGlass, ring.default]
