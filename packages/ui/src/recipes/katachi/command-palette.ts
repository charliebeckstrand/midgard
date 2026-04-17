import { narabi } from '../narabi'
import { sawari } from '../sawari'
import { sumi } from '../sumi'

export const commandPalette = {
	group: 'py-1 first:pt-2 last:pb-2',
	heading: ['px-3 pb-1 pt-1', 'text-xs/5 font-medium', sumi.textMuted],
	item: [
		// ── Layout ──────────────────────────────────────
		'group/option flex w-full items-center',
		// ── Spacing ─────────────────────────────────────
		'gap-3 px-3',
		// ── Tokens ──────────────────────────────────────
		...sawari.item,
		...narabi.item,
		// ── Data-[active] ───────────────────────────────
		'data-active:bg-zinc-950/5',
		'dark:data-active:bg-white/5',
	],
	label: 'truncate',
	description: ['text-xs/5', narabi.description, sumi.textMuted],
	shortcut: 'ml-auto',
}
