import { kage } from '../kage'
import { sumi } from '../sumi'

export const dl = {
	base: 'grid grid-cols-1 text-sm/6 sm:grid-cols-[min(50%,--spacing(56))_auto]',
	term: [
		sumi.textMuted,
		kage.borderSubtleColor,
		'col-start-1 border-t pt-3 first:border-none',
		'sm:py-3',
		'font-medium',
	],
	details: [
		sumi.text,
		kage.borderSubtleColor,
		'pb-3 pt-1',
		'sm:border-t sm:py-3',
		'sm:nth-2:border-none',
	],
}
