/**
 * Omote skeleton: loading skeleton background. Pulses on a neutral tone,
 * reading as inactive against any surface.
 *
 * Layer: kiso · Concern: skeleton fill
 */

import { ugoki } from '../ugoki'

import { bg } from './bg'

const { css } = ugoki

export const skeleton = {
	/** The pulse on the skeleton tone, as a background. */
	base: [bg.skeleton.base, css.pulse],
	/** The same pulse on the same tone, as an SVG fill, for a skeleton drawn as a shape. */
	shape: [bg.skeleton.fill, css.pulse],
}
