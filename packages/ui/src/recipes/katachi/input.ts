import { kage } from '../kage'
import { maru } from '../maru'
import { omote } from '../omote'
import { sumi } from '../sumi'
import { take } from '../take'
import { waku } from '../waku'

export const input = {
	base: [...waku.inputBase, 'block', maru.rounded],
	variant: {
		default: [],
		outline: kage.borderEmphasis,
		glass: omote.glass,
	},
	size: take.control,
	affix: ['absolute inset-y-0 flex items-center', 'pointer-events-none', sumi.textMuted],
	prefix: {
		base: 'left-0',
		input: { sm: 'pl-8', md: 'pl-9', lg: 'pl-11' },
		sm: 'pl-2.5 has-[button]:pl-1',
		md: 'pl-3 has-[button]:pl-1.5',
		lg: 'pl-3.5 has-[button]:pl-1.5',
	},
	suffix: {
		base: 'right-0',
		input: { sm: 'pr-8', md: 'pr-9', lg: 'pr-11' },
		sm: 'pr-2.5 has-[button]:pr-1',
		md: 'pr-3 has-[button]:pr-1.5',
		lg: 'pr-3.5 has-[button]:pr-1.5',
	},
	defaults: { variant: 'default' as const, size: 'md' as const },
	date: waku.date,
	number: waku.number,
}
