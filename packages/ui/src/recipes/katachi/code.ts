import { maru } from '../maru'
import { narabi } from '../narabi'
import { sumi, yoru } from '../sumi'

const blockBg = 'bg-[#0d1117]'

export const code = {
	inline: {
		base: ['font-mono py-0.75', 'bg-zinc-950/[0.06] dark:bg-white/10 mx-0.5', maru.roundedMd],
		size: {
			sm: ['text-[0.625rem]', 'p-1'],
			md: ['text-xs', 'p-1.25'],
			lg: ['text-sm', 'p-1.5'],
		},
	},
	block: {
		base: ['relative overflow-hidden', blockBg, maru.rounded],
		inline: 'w-fit max-w-full',
		content: '[&_pre]:overflow-x-auto [&_pre]:p-4 [&_pre]:pr-14 [&_pre]:text-sm/6',
		fallback: ['overflow-x-auto p-4 pr-14 text-sm/6', 'text-zinc-400'],
		copyWrapper: ['absolute top-0 right-0 z-10 p-3', blockBg],
		copy: [
			narabi.center.flex,
			'size-8',
			maru.rounded,
			sumi.textMuted,
			yoru.textHover,
			yoru.textFocus,
			'disabled:text-green-600',
		],
	},
}
