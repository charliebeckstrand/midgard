import { iro } from '../ryu/iro'
import { ji } from '../ryu/ji'
import { sawari } from '../ryu/sawari'
import { sen } from '../ryu/sen'

export const fileUpload = {
	dropzone: [
		'flex flex-col items-center justify-center',
		'gap-xs',
		ji.size.md,
		iro.text.muted,
		'rounded-lg',
		sen.focus.ring,
		'border border-dashed',
		'border-zinc-300',
		'dark:border-zinc-700',
		...sawari.cursor,
		'hover:not-disabled:border-zinc-400',
		'dark:hover:not-disabled:border-zinc-500',
		'data-[drag-over]:border-blue-500 data-[drag-over]:bg-blue-50/50',
		'dark:data-[drag-over]:border-blue-400 dark:data-[drag-over]:bg-blue-950/20',
		'disabled:opacity-50 disabled:cursor-not-allowed',
	],
	icon: 'shrink-0',
	label: ['font-medium', iro.text.default],
}
