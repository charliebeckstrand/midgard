import { form } from '../../primitives/form'
import { maru } from '../maru'
import { narabi } from '../narabi'
import { sawari } from '../sawari'
import { sumi } from '../sumi'
import { take } from '../take'

export const combobox = {
	input: [...form.inputBase, take.control.md, take.combobox.padding, maru.rounded, 'truncate'],
	chevron: [take.control.icon, take.combobox.icon, sumi.textMuted],
	options: take.popup,
	option: [...sawari.item, ...narabi.item],
	empty: ['hidden p-2 text-sm only:block', sumi.textMuted],
}
