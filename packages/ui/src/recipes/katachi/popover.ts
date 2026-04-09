import { maru } from '../maru'
import { omote } from '../omote'

export const popover = {
	trigger: 'inline-flex',
	portal: 'z-100',
	content: [omote.popover, maru.rounded, 'z-50 p-4'],
}
