import { narabi } from '../narabi'
import { sumi } from '../sumi'
import { yasumi } from '../yasumi'

export const fieldset = {
	base: ['[&>legend+*]:pt-6', yasumi.disabled],
	legend: [sumi.text, 'text-base/6 font-semibold', yasumi.disabled],
	field: [...narabi.field, yasumi.disabled],
	label: [sumi.text, 'text-base/6 select-none', yasumi.disabled],
	description: [sumi.textMuted, 'text-base/6', yasumi.disabled],
	error: [sumi.textError, 'text-base/6', yasumi.disabled],
}
