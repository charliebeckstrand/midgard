export const chipSize = { sm: 'xs', md: 'sm', lg: 'md' } as const
export const chipRemoveSize = {
	sm: 'size-3.5 *:data-[slot=icon]:size-2.5',
	md: 'size-4 *:data-[slot=icon]:size-3',
	lg: 'size-4.5 *:data-[slot=icon]:size-3.5',
} as const
