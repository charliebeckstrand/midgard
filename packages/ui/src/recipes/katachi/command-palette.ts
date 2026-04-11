import { kage } from '../kage'
import { narabi } from '../narabi'
import { omote } from '../omote'
import { sawari } from '../sawari'
import { sumi } from '../sumi'
import { take } from '../take'

export const commandPalette = {
	panel: {
		base: [
			omote.panel.base,
			'relative flex w-full flex-col overflow-hidden',
			'max-sm:rounded-t-2xl max-sm:rounded-b-none max-sm:max-h-[85dvh]',
			'sm:rounded-2xl sm:max-h-[60dvh]',
		],
		size: take.panel,
		defaults: { size: '2xl' as const },
	},
	inputRow: ['flex items-center gap-3 px-4 h-12 sm:h-11', kage.separator],
	inputIcon: [sumi.textMuted, 'size-5 shrink-0'],
	input: [
		'block w-full appearance-none bg-transparent outline-hidden',
		'text-base/6 sm:text-sm/6',
		sumi.text,
		'placeholder:text-zinc-500 dark:placeholder:text-zinc-400',
	],
	list: 'flex-1 min-h-0 overflow-y-auto overscroll-contain p-1',
	group: 'py-1 first:pt-2 last:pb-2',
	heading: [sumi.textMuted, 'px-3 pb-1 pt-1 text-xs/5 font-medium'],
	item: [
		'group/option flex w-full items-center gap-3 px-3',
		...sawari.item,
		...narabi.item,
		'data-active:bg-zinc-950/5 dark:data-active:bg-white/5',
	],
	label: 'truncate',
	description: [narabi.description, sumi.textMuted, 'text-xs/5'],
	shortcut: ['ml-auto pl-4 font-mono text-xs', sumi.textMuted],
	empty: ['p-6 text-center text-sm', sumi.textMuted],
}
