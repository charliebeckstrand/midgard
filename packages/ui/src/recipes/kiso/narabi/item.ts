/**
 * Narabi item: icon-slot dimensioning for sibling items in a list.
 * Composes the stepped icon size with the inherit-color rule and the
 * forced-colors safety net for High Contrast Mode legibility.
 *
 * The size is `shaku.icon.slot.base`. Thus an icon takes the step of the
 * nearest density scope, as the text and the padding of a Menu or an Option row
 * do. A kata with fixed chrome, such
 * as CommandPalette, sets `shaku.icon.slot.md` after it.
 *
 * Layer: kiso · Concern: icon-slot dimensioning
 */

import { sen } from '../sen'
import { shaku } from '../shaku'

const { forced } = sen

export const item = [...shaku.icon.slot.base, 'text-inherit', forced.icon]
