/**
 * Control archetype — input element. The standard text-input base for
 * the applicator: the bare element `reset` plus the kasane rounded
 * corner. Lives here so the applicator imports a single pre-assembled
 * fragment instead of composing in its file.
 *
 * Layer: katakana · Archetype: control · Concern: input
 */

import { kasane } from '../../kiso/kasane'

import { reset } from './reset'

const { rounded } = kasane

export const input = [...reset, rounded.lg]
