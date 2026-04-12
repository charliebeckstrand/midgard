import { maru } from '../maru'
import { narabi } from '../narabi'
import { take } from '../take'

const blockBg = 'bg-[#0d1117]'

export const code = {
	inline: {
		base: [take.code.base, take.code.margin],
		size: take.code.size,
	},
	block: {
		base: ['relative overflow-hidden', maru.rounded, blockBg],
		inline: 'w-fit max-w-full',
		content: '[&_pre]:overflow-x-auto [&_pre]:p-4 [&_pre]:pr-14 [&_pre]:text-sm/6',
		fallback: ['p-4 pr-14', 'text-sm/6 text-zinc-400', 'overflow-x-auto'],
		copyWrapper: ['absolute top-0 right-0', 'p-3', 'z-10', blockBg],
		copy: [
			'size-8',
			narabi.position.center,
			maru.rounded,
			'text-zinc-400',
			'hover:not-disabled:text-white',
			'focus-visible:not-disabled:text-white',
			'disabled:text-green-600',
		],
	},
}
