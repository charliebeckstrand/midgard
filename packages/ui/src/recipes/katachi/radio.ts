import { ki } from '../ki'
import { kumi } from '../kumi'
import { maru } from '../maru'
import { nuri } from '../nuri'
import { sumi } from '../sumi'
import { waku } from '../waku'

export const radio = {
	wrapper: [
		kumi.centerInline,
		'relative size-4.5 cursor-pointer',
		'has-checked:*:data-[slot=radio-indicator]:opacity-100',
		ki.outline,
	],
	color: nuri.radio,
	base: [
		...waku.checkSurface,
		maru.roundedFull,
		'[--radio-checked-border:transparent]',
		'has-checked:bg-(--radio-checked-bg) has-checked:border-(--radio-checked-border)',
		'not-has-[:disabled]:has-checked:hover:opacity-90',
	],
	input: waku.check,
	disabled: sumi.textDisabled,
}
