import { kage } from '../kage'
import { ki } from '../ki'
import { maru } from '../maru'
import { narabi } from '../narabi'
import { nuri } from '../nuri'
import { omote } from '../omote'
import { sawari } from '../sawari'
import { take } from '../take'
import { yasumi } from '../yasumi'

export const button = {
	base: [
		narabi.position.centerInline,
		narabi.position.isolate,
		'w-fit',
		'shrink-0',
		'font-semibold',
		'border',
		maru.rounded,
		ki.ring,
		yasumi.disabled,
		sawari.cursor,
	],
	variant: {
		solid: {
			base: kage.borderTransparent,
			color: nuri.buttonSolid,
		},
		soft: {
			base: kage.borderTransparent,
			color: nuri.buttonSoft,
		},
		outline: {
			base: kage.borderStrong,
			color: nuri.buttonOutline,
		},
		plain: {
			base: kage.borderTransparent,
			color: nuri.buttonPlain,
		},
		ghost: {
			base: kage.borderTransparent,
			color: nuri.buttonGhost,
		},
		glass: {
			base: [kage.borderTransparent, omote.glass],
			color: nuri.buttonPlain,
		},
	},
	size: take.button,
	withIcon: take.buttonWithIcon,
	withKbd: take.buttonWithKbd,
	iconOnly: take.buttonWithIconSize,
	defaults: { variant: 'solid' as const, color: 'zinc' as const, size: 'md' as const },
}
