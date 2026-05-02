import { iro } from '../ryu/iro'
import { ji } from '../ryu/ji'
import { sen } from '../ryu/sen'
import { ugoki } from '../ryu/ugoki'

export const tree = {
	base: ['flex flex-col', 'gap-0.5'],
	itemContent: [
		'flex w-full items-center',
		'py-1 px-2',
		ji.size.sm,
		'gap-1.5',
		iro.text.muted,
		iro.text.hover,
		'rounded-lg',
		sen.focus.inset,
		'cursor-pointer',
		'data-[open]:text-zinc-950 dark:data-[open]:text-white',
	],
	itemContentActive: iro.text.default,
	chevron: ['flex-none', ugoki.css.transform, ugoki.css.duration],
	label: 'flex-1 truncate text-left',
	group: 'overflow-hidden',
}
