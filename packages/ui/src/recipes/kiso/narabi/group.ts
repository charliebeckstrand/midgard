/**
 * Narabi group — slot adjacency rules for `<Fieldset>` groups. Spaces
 * stacked fields and gives the group label a heavier weight than its
 * children's labels.
 *
 * Layer: kiso · Concern: fieldset adjacency
 */

export const group = [
	'[&>[data-slot=field]+[data-slot=field]]:mt-2',
	'[&>[data-slot=label]+[data-slot=field]]:mt-4',
	'**:data-[slot=label]:font-normal',
	'has-data-[slot=description]:**:data-[slot=label]:font-medium',
]
