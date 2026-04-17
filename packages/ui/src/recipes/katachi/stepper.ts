import { kage } from '../kage'
import { maru } from '../maru'
import { sumi } from '../sumi'
import { yasumi } from '../yasumi'

export const stepper = {
	base: 'flex w-full',
	orientation: {
		horizontal: 'flex-row items-start gap-4 px-4',
		vertical: 'flex-col items-start gap-4 pr-4 py-4',
	},

	step: {
		base: ['group relative text-left', 'outline-none', yasumi.disabled],
		orientation: {
			horizontal: 'flex shrink-0 flex-col items-center w-32 gap-0.5 text-center',
			vertical: ['flex w-full items-center gap-4 py-1 first:pt-0', kage.borderSubtleColor],
		},
	},

	content: 'flex flex-1 flex-col gap-1',

	indicator: {
		base: ['relative', 'size-3.5 shrink-0', maru.roundedFull, 'bg-zinc-400', 'dark:bg-zinc-600'],
		interactive: [
			'group-enabled:group-hover:bg-zinc-500',
			'group-focus-visible:outline-2 group-focus-visible:outline-blue-600',
		],
	},

	title: {
		base: ['text-sm font-medium leading-none', 'text-zinc-400', 'dark:text-zinc-600'],
		interactive: [
			'group-data-[state=current]:text-zinc-950 dark:group-data-[state=current]:text-white',
			'group-enabled:group-hover:group-not-data-[state=current]:text-zinc-500',
		],
		orientation: {
			horizontal: 'mt-2',
			vertical: '',
		},
	},

	description: ['text-xs/4', sumi.textMuted],

	separator: {
		base: 'shrink-0',
		orientation: {
			horizontal: ['-mx-12 mt-2 flex-1 self-start', 'border-t', kage.borderColor],
			vertical: 'hidden',
		},
	},

	activeIndicator: ['z-10', 'bg-blue-600 dark:bg-blue-600'],
	defaults: { orientation: 'horizontal' as const },
}
