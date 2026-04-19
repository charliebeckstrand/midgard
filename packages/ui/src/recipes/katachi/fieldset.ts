import { narabi } from '../narabi'
import { sumi } from '../sumi'
import { yasumi } from '../yasumi'

export const fieldset = {
	base: ['[&>legend+*]:pt-4', yasumi.disabled],
	legend: ['text-base/6 font-semibold', sumi.text, yasumi.disabled],
	field: [
		...narabi.field,
		'data-disabled:border-zinc-950/20 data-disabled:cursor-not-allowed',
		'dark:data-disabled:border-white/15',
	],
	label: ['text-base/6 select-none', sumi.text, yasumi.disabled],
	description: ['text-base/6', sumi.textMuted, yasumi.disabled],
	error: ['text-base/6', sumi.textError, yasumi.disabled],
}
