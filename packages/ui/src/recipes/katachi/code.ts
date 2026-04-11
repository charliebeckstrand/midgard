import { maru } from '../maru'

const blockBg = 'bg-[#0d1117]'
const blockPre = ['overflow-x-auto', 'p-4', 'pr-14', 'text-sm/6'] as const

export const code = {
	inline: [
		'font-mono text-[0.875em]',
		'px-1.5 py-0.5',
		'bg-zinc-950/[0.06] dark:bg-white/10',
		maru.roundedMd,
	],
	block: {
		base: ['relative overflow-hidden', blockBg, maru.rounded],
		content: blockPre.map((c) => `[&_pre]:${c}`),
		fallback: [...blockPre, 'text-zinc-400'],
		copy: [
			'absolute top-2 right-2 z-10',
			blockBg,
			'flex size-8 items-center justify-center rounded-md',
			'text-zinc-400 transition-colors',
			'not-disabled:hover:text-white not-disabled:focus-visible:text-white',
			'disabled:text-green-500',
		],
	},
}
