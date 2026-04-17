import { maru } from '../maru'
import { sumi } from '../sumi'
import { text } from '../take/density'
import { waku } from '../waku'

export const tagInput = {
	wrapper: [
		'flex items-center gap-4',
		...waku.inputBase,
		maru.rounded,
		'cursor-text',
		'data-disabled:cursor-not-allowed data-disabled:**:!cursor-not-allowed',
	],
	wrapperSize: {
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
	input: [
		'flex-1 min-w-20',
		sumi.text,
		'bg-transparent border-none p-0',
		'focus:outline-none',
	],
	defaults: { size: 'md' as const },
}
