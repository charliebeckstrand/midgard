import { form } from '../../primitives/form'
import { kage } from '../kage'
import { ki } from '../ki'
import { maru } from '../maru'
import { nuri } from '../nuri'

export const switchRecipe = {
	wrapper: [
		'relative inline-flex h-6 w-10 shrink-0 items-center',
		'has-checked:*:data-[slot=switch-thumb]:left-5',
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
	input: form.hidden,
	thumb: [
		'absolute top-1 left-1 inline-block',
		'transition-[left] duration-0',
		'pointer-events-none',
		'size-4',
		maru.roundedFull,
		nuri.switchThumb,
		kage.shadow,
	],
	field: 'grid-cols-[2.5rem_1fr] items-center *:data-[slot=control]:mt-0',
}
