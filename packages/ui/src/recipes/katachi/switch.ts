import { form } from '../../primitives/form'
import { kage } from '../kage'
import { maru } from '../maru'
import { nuri } from '../nuri'

export const switchRecipe = {
	color: nuri.switch,
	base: [
		...form.hidden,
		maru.roundedFull,
		nuri.switchTrack,
		'checked:bg-(--switch-bg) checked:ring-(--switch-bg-ring) checked:ring-inset',
		nuri.switchHover,
	],
	thumb: [
		'pointer-events-none absolute top-1 left-1 inline-block size-4',
		maru.roundedFull,
		nuri.switchThumb,
		kage.shadow,
		'transition-[left] duration-200 ease-in-out',
	],
}
