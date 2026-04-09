import { form } from '../../primitives/form'
import { kage } from '../kage'
import { maru } from '../maru'
import { nuri } from '../nuri'

export const switchRecipe = {
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
}
