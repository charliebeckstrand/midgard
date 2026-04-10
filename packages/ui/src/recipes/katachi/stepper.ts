import { kage } from '../kage'
import { ki } from '../ki'
import { maru } from '../maru'
import { sumi } from '../sumi'
import { yasumi } from '../yasumi'

export const stepper = {
	base: 'flex w-full',
	orientation: {
		horizontal: 'flex-row items-start',
		vertical: 'flex-col items-stretch',
	},
	step: {
		base: [
			'group relative text-left outline-none',
			ki.offset,
			yasumi.disabled,
			'data-[clickable=true]:cursor-pointer data-[clickable=false]:cursor-default',
		],
		orientation: {
			horizontal: 'flex flex-col items-center gap-2 text-center',
			vertical: 'grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-0.5',
		},
	},
	indicator: [
		'relative flex size-8 shrink-0 items-center justify-center',
		'text-sm font-semibold',
		maru.roundedFull,
		kage.border,
		'bg-white text-zinc-500',
		'dark:bg-zinc-900 dark:text-zinc-400',
		// current state
		'group-data-[state=current]:border-blue-600 group-data-[state=current]:text-blue-600',
		'dark:group-data-[state=current]:border-blue-400 dark:group-data-[state=current]:text-blue-400',
		// completed state
		'group-data-[state=completed]:border-blue-600 group-data-[state=completed]:bg-blue-600 group-data-[state=completed]:text-white',
		'dark:group-data-[state=completed]:border-blue-400 dark:group-data-[state=completed]:bg-blue-400 dark:group-data-[state=completed]:text-zinc-950',
	],
	title: [
		'col-start-2 text-sm/5 font-medium',
		sumi.textMuted,
		'group-data-[state=current]:text-zinc-950 dark:group-data-[state=current]:text-white',
		'group-data-[state=completed]:text-zinc-950 dark:group-data-[state=completed]:text-white',
	],
	description: ['col-start-2 text-xs/5', sumi.textMuted],
	separator: {
		base: 'shrink-0 bg-zinc-200 dark:bg-zinc-800',
		orientation: {
			horizontal: 'mt-4 h-px min-w-6 flex-1 self-start',
			vertical: 'ml-4 min-h-6 w-px self-start',
		},
	},
	activeIndicator: ['inset-[-4px]', 'bg-blue-600/10 dark:bg-blue-400/15'],
	defaults: { orientation: 'horizontal' as const },
}
