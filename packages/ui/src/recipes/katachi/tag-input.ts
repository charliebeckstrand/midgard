import { iro } from '../iro'
import { ji } from '../ji'
import { maru } from '../maru'
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
		xs: ['p-[calc(--spacing(1)-1px)]', ji.size.xs],
		sm: ['p-[calc(--spacing(1.5)-1px)]', ji.size.sm],
		md: ['p-[calc(--spacing(2)-1px)]', ji.size.md],
		lg: ['p-[calc(--spacing(2.5)-1px)]', ji.size.lg],
	},
	base: ['flex flex-wrap items-center content-center gap-1 flex-1'],
	size: {
		xs: [ji.size.xs],
		sm: [ji.size.sm],
		md: [ji.size.md],
		lg: [ji.size.lg],
	},
	input: [
		'flex-1 min-w-20',
		iro.text.default,
		'bg-transparent border-none p-0',
		'focus:outline-none',
	],
	defaults: { size: 'md' as const },
}
