import { form } from '../../primitives/form'
import { maru } from '../maru'
import { nuri } from '../nuri'

export const radio = {
	color: nuri.radio,
	base: [
		...form.checkSurface,
		maru.roundedFull,
		'has-checked:border-transparent has-checked:bg-(--radio-checked-bg)',
		'has-checked:border-(--radio-checked-border)',
		'not-has-[:disabled]:has-checked:hover:opacity-90',
	],
	input: form.check,
}
