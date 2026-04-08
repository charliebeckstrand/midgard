import { form } from '../../primitives/form'
import { maru } from '../maru'
import { nuri } from '../nuri'

export const radio = {
	color: nuri.radio,
	base: [
		...form.check,
		maru.roundedFull,
		'checked:border-transparent checked:bg-(--radio-checked-bg)',
		'checked:border-(--radio-checked-border)',
	],
}
