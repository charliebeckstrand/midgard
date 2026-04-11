import { maru } from '../maru'
import { sumi } from '../sumi'

const blockBg = 'bg-[#0d1117]'

const blockPre = ['overflow-x-auto', 'p-4', 'pr-14', 'text-sm/6'] as const

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
		content: blockPre.map((c) => `[&_pre]:${c}`),
		fallback: [...blockPre, 'text-zinc-400'],
		copy: [
			'absolute top-3 right-3 z-10',
			blockBg,
			'flex size-8 items-center justify-center rounded-md',
			sumi.textMuted,
			sumi.textHover,
			'disabled:text-green-600',
		],
	},
}
