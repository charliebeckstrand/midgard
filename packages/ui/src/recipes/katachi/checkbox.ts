import { form } from '../../primitives/form'
import { ki } from '../ki'
import { nuri } from '../nuri'

export const checkbox = {
	wrapper: [
		'relative inline-flex size-4.5 items-center justify-center',
		'has-checked:*:data-[slot=checkbox-check]:opacity-100',
		ki.outline,
	],
	color: nuri.checkbox,
	base: [
		...form.checkSurface,
		'rounded-[--spacing(1)]',
		'[--checkbox-checked-border:transparent]',
		'has-checked:bg-(--checkbox-checked-bg) has-checked:border-(--checkbox-checked-border)',
		'not-has-[:disabled]:has-checked:hover:opacity-90',
	],
	input: form.check,
}
