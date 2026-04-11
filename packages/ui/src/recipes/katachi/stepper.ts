import { kage } from '../kage'
import { maru } from '../maru'
import { narabi } from '../narabi'
import { nuri } from '../nuri'
import { sumi } from '../sumi'
import { yasumi } from '../yasumi'

export const stepper = {
	base: 'flex w-full',
	orientation: {
		horizontal: 'flex-row items-start gap-3 px-3',
		vertical: 'flex-col items-start gap-4.5 pr-3 py-3',
	},
	step: {
		base: ['group relative text-left outline-none', yasumi.disabled],
		orientation: {
			horizontal: 'flex shrink-0 flex-col items-center w-32 gap-0.5 text-center',
			vertical: [
				'flex w-full items-center gap-3 border-t first:border-none pt-4.5 first:pt-0',
				kage.borderSubtleColor,
			],
		},
	},
	content: 'flex flex-1 flex-col gap-1',
	indicator: [
		narabi.position.center,
		'relative size-7 shrink-0',
		'text-sm',
		maru.roundedFull,
		kage.borderSubtle,
		'bg-transparent text-zinc-500',
		'group-focus-visible:outline-2 group-focus-visible:outline-blue-600 group-focus-visible:border-transparent',
	],
	title: {
		base: ['text-sm font-medium leading-none', sumi.textMuted],
		interactive: [
			'group-data-[state=current]:text-zinc-950 dark:group-data-[state=current]:text-white',
			'group-hover:text-zinc-950 dark:group-hover:text-white',
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
			horizontal: ['-mx-12 mt-4 flex-1 self-start border-t', kage.borderSubtleColor],
			vertical: 'hidden',
		},
	},
	activeIndicator: ['z-30', ...nuri.buttonSoft.blue],
	activeIndicatorDot: [
		'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
		'size-3 bg-blue-600 dark:bg-blue-600',
		maru.roundedFull,
	],
	activeIndicatorBorder: [
		'z-30',
		'bg-transparent dark:bg-transparent',
		'border-2 border-blue-600 dark:border-blue-600',
	],
	defaults: { orientation: 'horizontal' as const },
}
