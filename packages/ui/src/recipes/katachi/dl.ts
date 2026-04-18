import { kage } from '../kage'
import { sumi } from '../sumi'
import { take } from '../take'

export const dl = {
	base: ['grid grid-cols-1 sm:grid-cols-[min(50%,--spacing(56))_auto]', take.text.sm],
	term: [
		'col-start-1',
		sumi.textMuted,
		'font-medium',
		'border-t first:border-none',
		kage.borderSubtleColor,
		'sm:py-2 pt-2',
	],
	details: [sumi.text, kage.borderSubtleColor, 'sm:border-t sm:py-2 pb-2', 'sm:nth-2:border-none'],
}
