/**
 * Omote skeleton: loading skeleton background. Pulses on a neutral tone,
 * reading as inactive against any surface.
 *
 * Layer: kiso · Concern: skeleton fill
 */

import { ugoki } from '../ugoki'

import { bg } from './bg'

const { css } = ugoki

export const skeleton = [bg.skeleton, css.pulse]

/** The same pulse on the same tone, as an SVG fill, for a skeleton drawn as a shape. */
export const skeletonShape = [bg.skeletonFill, css.pulse]
