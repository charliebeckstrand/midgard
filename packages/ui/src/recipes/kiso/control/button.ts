/**
 * Control archetype: button. The base of a control that is a `<button>`: the
 * trigger of Listbox, DatePicker, and ColorPicker. It opens a popup and shows
 * its value as an input does, so it takes the input reset, aligns its text to
 * the start, and takes the cursor and the density of a control. Each kata adds
 * its own layout.
 *
 * Layer: kiso · Archetype: control · Concern: button
 */

import { hannou } from '../hannou'
import { density } from './density'
import { reset } from './reset'

export const button = [...reset.base, 'text-start', 'appearance-none', ...hannou.cursor, ...density]
