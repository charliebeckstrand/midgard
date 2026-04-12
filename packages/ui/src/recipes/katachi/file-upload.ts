import { ki } from '../ki'
import { maru } from '../maru'
import { sumi } from '../sumi'

export const fileUpload = {
	dropzone: [
		'flex flex-col items-center justify-center gap-2',
		'border border-dashed border-zinc-300 dark:border-zinc-700',
		'cursor-pointer transition-colors',
		maru.rounded,
		ki.ring,
		sumi.textMuted,
		// Hover
		'hover:border-zinc-400 dark:hover:border-zinc-500',
		'hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50',
		// Drag over (driven by data attribute)
		'data-[drag-over]:border-blue-500 dark:data-[drag-over]:border-blue-400',
		'data-[drag-over]:bg-blue-50/50 dark:data-[drag-over]:bg-blue-950/20',
		// Disabled
		'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
	],
	size: {
		sm: 'p-4 text-sm',
		md: 'p-6 text-sm',
		lg: 'p-10 text-sm',
	},
	icon: 'shrink-0',
	label: ['font-medium', sumi.text],
	defaults: { size: 'md' as const },
}
