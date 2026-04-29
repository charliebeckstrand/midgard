import { iro } from '../iro'
import { ji } from '../ji'
import { sen } from '../sen'

export const dl = {
	base: ['grid grid-cols-1 sm:grid-cols-[min(50%,--spacing(56))_auto]', ji.size.sm],
	term: [
		'col-start-1',
		iro.text.muted,
		'font-medium',
		'border-t first:border-none',
		sen.borderSubtleColor,
		'sm:py-2 pt-2 pr-2',
	],
	details: [
		iro.text.default,
		sen.borderSubtleColor,
		'sm:border-t sm:py-2 pb-2',
		'sm:nth-2:border-none',
	],
}
