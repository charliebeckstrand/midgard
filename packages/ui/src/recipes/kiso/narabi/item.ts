/**
 * Narabi item — icon-slot dimensioning for sibling items in a list.
 * Composes the standard icon size with the inherit-colour rule and the
 * forced-colors safety net so icons stay legible in High Contrast Mode.
 *
 * Layer: kiso · Concern: icon-slot dimensioning
 */

import { sen } from '../sen'
import { shaku } from '../shaku'

export const item = [shaku.icon.md, 'text-inherit', sen.forced.icon]
