import { iro } from '../iro'
import { narabi } from '../narabi'
import { sawari } from '../sawari'

export const fieldset = {
	base: ['[&>legend+*]:pt-4', sawari.disabled],
	legend: ['text-base/6 font-semibold', iro.text.default, sawari.disabled],
	field: [
		...narabi.field,
		'data-disabled:border-zinc-950/20 data-disabled:cursor-not-allowed',
		'dark:data-disabled:border-white/15',
	],
	label: ['text-base/6 select-none cursor-pointer', iro.text.default, sawari.disabled],
	description: ['text-base/6', iro.text.muted, sawari.disabled],
	error: ['text-base/6', iro.text.error, sawari.disabled],
}
