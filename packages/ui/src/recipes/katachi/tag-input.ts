import { maru } from '../maru'
import { sumi } from '../sumi'
import { text } from '../take/density'
import { waku } from '../waku'

export const tagInput = {
	container: [
		'flex items-center gap-4',
		'cursor-text',
		...waku.inputBase,
		maru.rounded,
		'data-disabled:cursor-not-allowed data-disabled:**:!cursor-not-allowed',
	],
	containerSize: {
		xs: ['p-[calc(--spacing(1)-1px)]', text.xs],
		sm: ['p-[calc(--spacing(1.5)-1px)]', text.sm],
		md: ['p-[calc(--spacing(2)-1px)]', text.md],
		lg: ['p-[calc(--spacing(2.5)-1px)]', text.lg],
	},
	base: ['flex flex-wrap items-center content-center gap-1 flex-1'],
	size: {
		xs: [text.xs],
		sm: [text.sm],
		md: [text.md],
		lg: [text.lg],
	},
	input: ['flex-1 min-w-20', 'bg-transparent border-none p-0', 'focus:outline-none', sumi.text],
	defaults: { size: 'md' as const },
}
