import { narabi } from '../narabi'
import { sumi } from '../sumi'
import { yasumi } from '../yasumi'

export const fieldset = {
	base: ['[&>legend+*]:pt-6', yasumi.disabled],
	legend: [sumi.text, 'text-base/6 font-semibold', yasumi.disabled],
	field: [
		...narabi.field,
		'data-disabled:border-zinc-950/20 data-disabled:cursor-not-allowed',
		'dark:data-disabled:border-white/15 dark:data-disabled:bg-white/2.5',
	],
	label: [sumi.text, 'text-base/6 select-none', yasumi.disabled],
	description: ['text-base/6', sumi.textMuted, yasumi.disabled],
	error: ['text-base/6', sumi.textError, yasumi.disabled],
}
