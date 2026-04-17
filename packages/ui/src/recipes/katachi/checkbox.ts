import { ki } from '../ki'
import { kumi } from '../kumi'
import { nuri } from '../nuri'
import { sumi } from '../sumi'
import { waku } from '../waku'

export const checkbox = {
	wrapper: [
		kumi.center.inline,
		'relative size-4.5 cursor-pointer',
		'has-checked:*:data-[slot=checkbox-check]:opacity-100',
		ki.outline,
	],
	color: nuri.checkbox,
	base: [
		...waku.checkSurface,
		'rounded-[--spacing(1)]',
		'[--checkbox-checked-border:transparent]',
		'has-checked:bg-(--checkbox-checked-bg) has-checked:border-(--checkbox-checked-border)',
		'not-has-[:disabled]:has-checked:hover:opacity-90',
	],
	input: waku.check,
	disabled: sumi.textDisabled,
}
