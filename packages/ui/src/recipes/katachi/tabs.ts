import { kage } from '../kage'
import { ki } from '../ki'
import { maru } from '../maru'
import { nuri } from '../nuri'
import { sawari } from '../sawari'
import { sumi } from '../sumi'
import { yasumi } from '../yasumi'

export const tabs = {
	list: ['flex gap-4', 'border-b', kage.borderSubtleColor],
	tab: [
		// ── Layout ──────────────────────────────────────
		'relative flex items-center gap-2',
		// ── Spacing ─────────────────────────────────────
		'px-1 py-3',
		// ── Typography ──────────────────────────────────
		'font-medium',
		// ── Tokens ──────────────────────────────────────
		...sumi.tab,
		ki.indicator,
		sawari.cursor,
		yasumi.disabled,
		// ── Focus ───────────────────────────────────────
		'outline-none',
		// ── Pseudo ──────────────────────────────────────
		'after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-full',
		'after:bg-transparent',
	],
	indicator: ['inset-x-0 -bottom-px top-auto h-0.5', maru.roundedFull, nuri.tabIndicator],
}
