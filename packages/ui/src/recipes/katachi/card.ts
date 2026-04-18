import { sumi } from '../sumi'
import { take } from '../take'

export const card = {
	header: ['px-4 pt-4 pb-0', sumi.text],
	title: ['font-semibold', take.text.md],
	description: [take.text.sm, sumi.textMuted],
	body: 'p-4',
	footer: ['px-4 pb-4 pt-0', 'flex items-center', take.gap.md],
}
