import { sumi } from '../sumi'

export const timeline = {
	base: 'list-none p-0 m-0',
	orientation: {
		vertical: 'flex flex-col',
		horizontal: 'flex flex-row overflow-x-auto',
	},
	variant: {
		solid: '',
		outline: '',
	},
	item: {
		base: 'relative',
		vertical: 'pl-8 pb-8 last:pb-0',
		horizontal: 'pt-8 pr-8 last:pr-0',
		active: '',
	},
	connector: {
		base: 'absolute',
		vertical: {
			solid: ['left-[6px] top-[20.5px] -bottom-[6.5px] w-0.5', 'bg-zinc-200 dark:bg-zinc-700'],
			outline: [
				'left-[6.5px] top-[20.5px] -bottom-[6.5px] w-px',
				'bg-zinc-950/10 dark:bg-white/10',
			],
		},
		horizontal: {
			solid: ['top-[6px] left-[20.5px] -right-[6.5px] h-0.5', 'bg-zinc-200 dark:bg-zinc-700'],
			outline: ['top-[6.5px] left-[20.5px] -right-[6.5px] h-px', 'bg-zinc-950/10 dark:bg-white/10'],
		},
	},
	marker: {
		base: ['absolute z-10 flex items-center justify-center', 'size-3.5 rounded-full'],
		solid: 'bg-zinc-300 dark:bg-zinc-600',
		outline: 'border-2 border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900',
		active: {
			solid: 'bg-blue-500 dark:bg-blue-400',
			outline: 'border-blue-500 dark:border-blue-400 bg-white dark:bg-zinc-900',
		},
		vertical: 'left-0 top-[6.5px]',
		horizontal: 'top-0 left-[6.5px]',
	},
	heading: ['text-sm/6 font-semibold', sumi.text],
	description: ['mt-0.5 text-sm/5', sumi.textMuted],
	timestamp: ['text-xs/5', sumi.textMuted],
	defaults: { orientation: 'vertical' as const, variant: 'solid' as const },
}
