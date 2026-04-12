import { maru } from '../maru'

export const otpInput = {
	root: 'flex items-center',
	gap: { sm: 'gap-1.5', md: 'gap-2', lg: 'gap-2.5' },
	cell: 'size-full text-center font-medium p-0',
	wrapper: ['[&_[data-slot=control]]:size-full', '[&_[data-slot=input]]:size-full'],
	size: {
		sm: ['size-8 text-sm/6', maru.roundedMd],
		md: ['size-10 text-base/6', maru.rounded],
		lg: ['size-12 text-lg/6', maru.rounded],
	},
	defaults: { size: 'md' as const },
}
