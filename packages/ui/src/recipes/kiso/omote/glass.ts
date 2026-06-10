/**
 * Omote glass: fully transparent glass surface. Blur only; the host
 * inherits its colour from whatever sits behind.
 *
 * Layer: kiso · Concern: glass surface
 */

import { blur } from './blur'

export const glass = ['bg-transparent', blur.md]
