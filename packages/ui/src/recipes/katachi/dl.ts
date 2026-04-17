import { kage } from '../kage'
import { sumi } from '../sumi'

export const dl = {
	base: 'grid grid-cols-1 text-sm/6 sm:grid-cols-[min(50%,--spacing(56))_auto]',
	term: [
		'col-start-1',
		'pt-3',
		'font-medium',
		sumi.textMuted,
		kage.borderSubtleColor,
		'border-t first:border-none',
		'sm:py-3',
	],
	details: [
		'pb-3 pt-1',
		sumi.text,
		kage.borderSubtleColor,
		'sm:border-t sm:py-3',
		'sm:nth-2:border-none',
	],
}
