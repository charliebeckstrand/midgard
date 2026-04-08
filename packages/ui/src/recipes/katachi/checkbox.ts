import { form } from '../../primitives/form'
import { nuri } from '../nuri'

export const checkbox = {
	color: nuri.checkbox,
	base: [
		...form.checkSurface,
		'rounded-[--spacing(1)]',
		'has-checked:border-transparent has-checked:bg-(--checkbox-checked-bg)',
		'has-checked:border-(--checkbox-checked-border)',
		'not-has-[:disabled]:has-checked:hover:opacity-90',
	],
	input: form.check,
}
