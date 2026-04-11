import { kage } from '../kage'
import { maru } from '../maru'
import { sumi } from '../sumi'
import { take } from '../take'
import { waku } from '../waku'

export const input = {
	base: [...waku.inputBase, maru.rounded],
	variant: {
		default: [],
		outline: kage.borderEmphasis,
	},
	size: take.control,
	affix: ['absolute inset-y-0 flex items-center', sumi.textMuted],
	prefix: 'pointer-events-none left-0 pl-3',
	suffix: 'pointer-events-none right-0 pr-3',
	prefixPadding: { sm: 'pl-8', md: 'pl-9', lg: 'pl-11' },
	suffixPadding: { sm: 'pr-8', md: 'pr-9', lg: 'pr-11' },
	defaults: { variant: 'default' as const, size: 'md' as const },
	date: waku.date,
	number: waku.number,
}
