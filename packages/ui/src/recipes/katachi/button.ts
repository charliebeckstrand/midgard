import { kage } from '../kage'
import { ki } from '../ki'
import { maru } from '../maru'
import { nuri } from '../nuri'
import { sawari } from '../sawari'
import { take } from '../take'
import { yasumi } from '../yasumi'

export const button = {
	base: [
		'relative isolate inline-flex items-center justify-center font-semibold',
		maru.rounded,
		ki.ring,
		yasumi.disabled,
		sawari.cursor,
	],
	variant: {
		solid: {
			base: ['border border-transparent', 'disabled:shadow-none'],
			color: nuri.buttonSolid,
		},
		soft: {
			base: ['border border-transparent'],
			color: nuri.buttonSoft,
		},
		outline: {
			base: [kage.borderStrong],
			color: nuri.buttonOutline,
		},
		plain: {
			base: ['border border-transparent'],
			color: nuri.buttonPlain,
		},
		ghost: {
			base: ['border border-transparent'],
			color: nuri.buttonGhost,
		},
	},
	size: take.button,
	withIcon: take.buttonWithIcon,
	withKbd: take.buttonWithKbd,
	iconOnly: take.buttonIcon,
	iconOnlyBase: 'p-0 gap-0',
	defaults: { variant: 'solid' as const, color: 'zinc' as const, size: 'md' as const },
}
