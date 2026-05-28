/**
 * Omote skeleton — loading skeleton background. Pulses on a neutral tone
 * so placeholders read as inactive against any surface.
 *
 * Layer: kiso · Concern: skeleton fill
 */

import { ugoki } from '../ugoki'

import { bg } from './bg'

const { css } = ugoki

export const skeleton = [bg.skeleton, css.pulse]
