import { kage } from '../kage'
import { maru } from '../maru'
import { omote } from '../omote'
import { sumi } from '../sumi'

export const card = {
	base: ['overflow-hidden', maru.rounded],
	variant: {
		outline: [kage.border, omote.surface],
		solid: [omote.tint],
		elevated: [kage.shadow, omote.surface],
	},
	header: ['px-5 pt-5 pb-0', sumi.text],
	title: 'text-base/6 font-semibold',
	description: ['mt-1 text-sm/5', sumi.textMuted],
	body: 'px-5 py-5',
	footer: ['px-5 pt-0 pb-5', 'flex items-center gap-3'],
	defaults: { variant: 'outline' as const },
}
