import { form } from '../../primitives/form'
import { ki } from '../ki'
import { maru } from '../maru'
import { nuri } from '../nuri'
import { sumi } from '../sumi'

export const radio = {
	wrapper: [
		'relative inline-flex size-4.5 items-center justify-center',
		'has-checked:*:data-[slot=radio-indicator]:opacity-100',
		ki.outline,
	],
	color: nuri.radio,
	base: [
		...form.checkSurface,
		maru.roundedFull,
		'[--radio-checked-border:transparent]',
		'has-checked:bg-(--radio-checked-bg) has-checked:border-(--radio-checked-border)',
		'not-has-[:disabled]:has-checked:hover:opacity-90',
	],
	input: form.check,
	disabled: sumi.textDisabled,
}
