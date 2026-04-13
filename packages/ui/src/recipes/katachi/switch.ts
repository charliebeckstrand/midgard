import { kage } from '../kage'
import { ki } from '../ki'
import { maru } from '../maru'
import { nuri } from '../nuri'
import { sumi } from '../sumi'
import { waku } from '../waku'

export const switchRecipe = {
	wrapper: [
		'relative inline-flex shrink-0 items-center cursor-pointer',
		'has-checked:*:data-[slot=switch-thumb]:bg-(--switch)',
		'has-checked:*:data-[slot=switch-thumb]:shadow-(--switch-shadow)',
		'has-checked:*:data-[slot=switch-thumb]:ring-(--switch-ring)',
		ki.outline,
	],
	color: nuri.switch,
	base: [
		maru.roundedFull,
		nuri.switchTrack,
		'has-checked:bg-(--switch-bg) has-checked:ring-(--switch-bg-ring) has-checked:ring-inset',
		'not-has-[:disabled]:not-has-[:checked]:hover:bg-zinc-300',
		'dark:not-has-[:disabled]:not-has-[:checked]:hover:bg-white/15',
		'has-[:disabled]:opacity-50 has-[:disabled]:cursor-not-allowed',
	],
	size: {
		sm: [
			'h-5 w-8',
			'*:data-[slot=switch-thumb]:size-3',
			'has-checked:*:data-[slot=switch-thumb]:left-4',
		],
		md: [
			'h-6 w-10',
			'*:data-[slot=switch-thumb]:size-4',
			'has-checked:*:data-[slot=switch-thumb]:left-5',
		],
		lg: [
			'h-7 w-12',
			'*:data-[slot=switch-thumb]:size-5',
			'has-checked:*:data-[slot=switch-thumb]:left-6',
		],
	},
	input: waku.hidden,
	disabled: sumi.textDisabled,
	thumb: [
		'absolute top-1 left-1 inline-block',
		'transition-[left] duration-200 ease-in-out',
		'pointer-events-none',
		maru.roundedFull,
		nuri.switchThumb,
		kage.shadow,
	],
	field: {
		base: '*:data-[slot=control]:row-span-2 *:data-[slot=control]:mt-0',
		size: {
			sm: 'grid-cols-[2rem_1fr]',
			md: 'grid-cols-[2.5rem_1fr]',
			lg: 'grid-cols-[3rem_1fr]',
		},
	},
	defaults: { size: 'md' as const },
}
