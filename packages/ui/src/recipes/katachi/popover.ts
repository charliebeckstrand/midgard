import { maru } from '../maru'
import { omote } from '../omote'
import { sumi } from '../sumi'

export const popover = {
	trigger: 'inline-flex',
	portal: 'z-100',
	content: ['z-50 p-4', omote.popover, sumi.text, maru.rounded],
}
