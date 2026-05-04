import { iro } from '../ryu/iro'
import { narabi } from '../ryu/narabi'
import { sawari } from '../ryu/sawari'

export const fieldset = {
	base: ['[&>legend+*]:pt-4', sawari.disabled],
	legend: ['text-base font-semibold', iro.text.default, sawari.disabled],
	field: [
		...narabi.field,
		'data-disabled:border-zinc-950/20 data-disabled:cursor-not-allowed',
		'dark:data-disabled:border-white/15',
	],
	label: [
		'text-base select-none',
		sawari.cursor,
		'[[data-slot=field]:has(:disabled)_&]:cursor-not-allowed',
		'[[data-slot=field]:has([data-disabled])_&]:cursor-not-allowed',
		'[[data-slot=control]:has(:disabled)_&]:cursor-not-allowed',
		'[[data-slot=control]:has([data-disabled])_&]:cursor-not-allowed',
		iro.text.default,
		sawari.disabled,
	],
	description: ['text-base', iro.text.muted, sawari.disabled],
	error: ['text-base', iro.text.error, sawari.disabled],
}
