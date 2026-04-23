import { iro } from '../iro'
import { ji } from '../ji'
import { kumi } from '../kumi'
import { maru } from '../maru'
import { sen } from '../sen'

export const fileUpload = {
	dropzone: [
		'flex flex-col items-center justify-center',
		kumi.gap.sm,
		ji.size.md,
		iro.text.muted,
		maru.rounded.lg,
		sen.focus.ring,
		'border border-dashed',
		'border-zinc-300',
		'dark:border-zinc-700',
		'cursor-pointer',
		'hover:not-disabled:border-zinc-400',
		'dark:hover:not-disabled:border-zinc-500',
		'data-[drag-over]:border-blue-500 data-[drag-over]:bg-blue-50/50',
		'dark:data-[drag-over]:border-blue-400 dark:data-[drag-over]:bg-blue-950/20',
		'disabled:opacity-50 disabled:cursor-not-allowed',
	],
	icon: 'shrink-0',
	label: ['font-medium', iro.text.default],
}
