/**
 * Control archetype: input element. Pre-assembled text-input base,
 * the bare element `reset` plus the kasane rounded corner.
 *
 * Layer: kiso · Archetype: control · Concern: input
 */

import { kasane } from '../kasane'

import { reset } from './reset'

const { rounded } = kasane

export const input = [...reset, rounded.lg]
