/**
 * Narabi group: slot adjacency rules for `<Fieldset>` groups. Spaces
 * stacked fields and gives the group label a heavier weight than its
 * children's labels. Each gap is a ramp of `dan.space.fieldset`, so it
 * follows density.
 *
 * Layer: kiso · Concern: fieldset adjacency
 */

import { dan } from '../dan'

const { fieldset } = dan.space

export const group = [
	fieldset.field,
	fieldset.label,
	'**:data-[slot=label]:font-normal',
	'has-data-[slot=description]:**:data-[slot=label]:font-medium',
]
