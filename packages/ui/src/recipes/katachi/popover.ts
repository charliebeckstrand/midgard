import { maru } from '../maru'
import { omote } from '../omote'
import { sumi } from '../sumi'

export const popover = {
	trigger: 'inline-flex',
	portal: 'z-100',
	content: [omote.popover, 'z-50 p-4', sumi.text, maru.rounded],
}
