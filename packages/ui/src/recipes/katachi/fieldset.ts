import { iro } from '../iro'
import { narabi } from '../narabi'
import { yasumi } from '../yasumi'

export const fieldset = {
	base: ['[&>legend+*]:pt-4', yasumi.disabled],
	legend: ['text-base/6 font-semibold', iro.text.default, yasumi.disabled],
	field: [
		...narabi.field,
		'data-disabled:border-zinc-950/20 data-disabled:cursor-not-allowed',
		'dark:data-disabled:border-white/15',
	],
	label: ['text-base/6 select-none cursor-pointer', iro.text.default, yasumi.disabled],
	description: ['text-base/6', iro.text.muted, yasumi.disabled],
	error: ['text-base/6', iro.text.error, yasumi.disabled],
}
