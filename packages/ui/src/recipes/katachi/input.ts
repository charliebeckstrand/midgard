import { form } from '../../primitives/form'
import { kage } from '../kage'
import { maru } from '../maru'
import { sumi } from '../sumi'
import { take } from '../take'

export const input = {
	base: [...form.inputBase, maru.rounded],
	variant: {
		default: [],
		outline: kage.borderEmphasis,
	},
	size: take.control,
	affix: ['absolute inset-y-0 flex items-center', sumi.textMuted],
	prefix: 'pointer-events-none left-0 pl-3',
	suffix: 'pointer-events-none right-0 pr-3',
	defaults: { variant: 'default' as const, size: 'md' as const },
	date: form.date,
}
