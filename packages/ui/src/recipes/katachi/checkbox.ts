import { form } from '../../primitives/form'
import { nuri } from '../nuri'

export const checkbox = {
	color: nuri.checkbox,
	base: [
		...form.check,
		'rounded-[--spacing(1)]',
		'checked:border-transparent checked:bg-(--checkbox-checked-bg)',
		'checked:border-(--checkbox-checked-border)',
	],
}
