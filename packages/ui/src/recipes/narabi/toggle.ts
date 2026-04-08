export const toggle = [
	'grid grid-cols-[1.125rem_1fr] gap-x-4 gap-y-1',
	'*:data-[slot=control]:col-start-1 *:data-[slot=control]:row-start-1 *:data-[slot=control]:mt-0.75',
	'*:data-[slot=label]:col-start-2 *:data-[slot=label]:row-start-1',
	'*:data-[slot=description]:col-start-2 *:data-[slot=description]:row-start-2',
	'has-data-[slot=description]:**:data-[slot=label]:font-medium',
	'has-disabled:**:data-[slot=label]:cursor-not-allowed',
]

export const group = [
	'space-y-3 **:data-[slot=label]:font-normal',
	'has-data-[slot=description]:**:data-[slot=label]:font-medium',
]
