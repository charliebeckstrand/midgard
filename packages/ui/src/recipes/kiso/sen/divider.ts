/**
 * Sen divider — top-border separator in the subtle tone. The dominant
 * use is between rows in a stacked layout where a full border would
 * read as a frame.
 *
 * Layer: kiso · Concern: dividers
 */

import { tone } from './tone'

/** Top divider — `border-t` with subtle colour. */
export const divider = ['border-t', ...tone.borderSubtle]
