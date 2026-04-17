import { maru } from '../maru'
import { take } from '../take'

const blockBg = 'bg-[#0d1117]'

export const code = {
	inline: {
		base: [take.code.base, take.code.margin],
		size: take.code.size,
		defaults: { size: 'md' as const },
	},
	block: {
		base: ['relative overflow-hidden', maru.rounded, blockBg],
		inline: 'w-fit max-w-full',
		content: '[&_pre]:overflow-x-auto [&_pre]:p-4 [&_pre]:text-sm/6',
		contentCopy: '[&_pre]:pr-14',
		fallback: [
			'overflow-x-auto',
			'p-4',
			'text-sm/6',
			'text-zinc-400',
		],
		fallbackCopy: 'pr-14',
		copyButton: ['text-zinc-400', 'hover:not-disabled:text-white', 'p-2 m-2'],
		copyButtonWrapper: ['absolute top-0 right-0 z-10', blockBg],
	},
}
