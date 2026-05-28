/**
 * Iro plain — text-only palette. No fill, no border. Used for tertiary
 * buttons and unstyled-looking interactive text. Composes the shared
 * text and hover shades.
 *
 * Layer: kiso · Concern: plain palette
 */

import { hover } from './hover'
import { text } from './text'

export const plain = { text, hover }
