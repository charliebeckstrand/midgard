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
		outline: [],
		glass: omote.glass,
	},
	control: {
		default: waku.control.surface,
		outline: [kage.borderEmphasis, 'hover:border-zinc-950/30', 'dark:hover:border-white/30'],
		glass: [],
	},
	size: take.control,
	affix: ['flex items-center min-w-0', '*:data-[slot=icon]:pointer-events-none', sumi.textMuted],
	prefix: {
		sm: 'pl-[calc(--spacing(2.5)-1px)] py-[calc(--spacing(0.5)-1px)] has-[button]:pl-1',
		md: 'pl-[calc(--spacing(3)-1px)] py-[calc(--spacing(1)-1px)] has-[button]:pl-1.5',
		lg: 'pl-[calc(--spacing(3.5)-1px)] py-[calc(--spacing(1.5)-1px)] has-[button]:pl-1.5',
	},
	suffix: {
		sm: 'pr-[calc(--spacing(2.5)-1px)] py-[calc(--spacing(0.5)-1px)] has-[button]:pr-1',
		md: 'pr-[calc(--spacing(3)-1px)] py-[calc(--spacing(1)-1px)] has-[button]:pr-1.5',
		lg: 'pr-[calc(--spacing(3.5)-1px)] py-[calc(--spacing(1.5)-1px)] has-[button]:pr-1.5',
	},
	autofill: {
		prefix: {
			sm: 'autofill:ml-[calc(--spacing(2.5)-1px)] peer-has-[button]/prefix:autofill:ml-1',
			md: 'autofill:ml-[calc(--spacing(3)-1px)] peer-has-[button]/prefix:autofill:ml-1.5',
			lg: 'autofill:ml-[calc(--spacing(3.5)-1px)] peer-has-[button]/prefix:autofill:ml-1.5',
		},
		suffix: {
			sm: 'autofill:mr-[calc(--spacing(2.5)-1px)] group-has-[[data-slot=suffix]_button]/control:autofill:mr-1',
			md: 'autofill:mr-[calc(--spacing(3)-1px)] group-has-[[data-slot=suffix]_button]/control:autofill:mr-1.5',
			lg: 'autofill:mr-[calc(--spacing(3.5)-1px)] group-has-[[data-slot=suffix]_button]/control:autofill:mr-1.5',
		},
	},
	defaults: { variant: 'default' as const, size: 'md' as const },
	date: waku.date,
	number: waku.number,
}
