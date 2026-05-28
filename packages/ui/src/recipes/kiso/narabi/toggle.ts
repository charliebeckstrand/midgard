/**
 * Narabi toggle — the two-column grid that holds a check/radio/switch
 * control alongside its label and description. Control sits in column 1
 * row 1, label in column 2 row 1, description in column 2 row 2.
 *
 * Layer: kiso · Concern: toggle-field grid
 */

export const toggle = [
	'group/field grid grid-cols-[1.125rem_1fr]',
	'gap-x-2',
	'*:data-[slot=control]:col-start-1 *:data-[slot=control]:row-start-1 *:data-[slot=control]:self-center',
	'*:data-[slot=label]:col-start-2 *:data-[slot=label]:row-start-1',
	'*:data-[slot=description]:col-start-2 *:data-[slot=description]:row-start-2',
	'has-data-[slot=description]:**:data-[slot=label]:font-medium',
	'has-disabled:**:data-[slot]:cursor-not-allowed',
]
