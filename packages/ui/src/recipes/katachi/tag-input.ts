import { maru } from '../maru'
import { sumi } from '../sumi'
import { take } from '../take'
import { waku } from '../waku'

export const tagInput = {
	base: ['flex flex-wrap items-center gap-1.5 cursor-text', ...waku.inputBase, maru.rounded],
	size: {
		sm: [take.control.sm, 'min-h-7'],
		md: [take.control.md, 'min-h-9'],
		lg: [take.control.lg, 'min-h-11'],
	},
	input: ['flex-1 min-w-20 bg-transparent border-none p-0 focus:outline-none', sumi.text],
	defaults: { size: 'md' as const },
}
