import { iro } from '../iro'
import { ji } from '../ji'
import { kumi } from '../kumi'

export const card = {
	header: ['px-4 pt-4 pb-0', iro.text.default],
	title: ['font-semibold', ji.size.md],
	description: [ji.size.sm, iro.text.muted],
	body: 'p-4',
	footer: ['px-4 pb-4 pt-0', 'flex items-center', kumi.gap.md],
}
