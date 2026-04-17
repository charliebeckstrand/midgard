import { kage } from '../kage'
import { ma } from '../ma'
import { maru } from '../maru'
import { omote } from '../omote'
import { sumi } from '../sumi'

export const dataTable = {
	base: 'relative flex flex-col gap-2',
	stickyWrapper: 'overflow-auto [&>[data-slot=table]]:!overflow-visible',
	stickyHead: [
		// ── Layout ──────────────────────────────────────
		'sticky top-0 z-10',
		// ── Tokens ──────────────────────────────────────
		omote.surface,
	],
	batchBar: [
		// ── Layout ──────────────────────────────────────
		'flex items-center',
		// ── Sizing ──────────────────────────────────────
		'min-h-12',
		// ── Spacing ─────────────────────────────────────
		'gap-3',
		ma.density.px.md,
		ma.density.py.sm,
		// ── Tokens ──────────────────────────────────────
		kage.borderSubtle,
		maru.rounded,
		// ── Border ──────────────────────────────────────
		'border-b',
		// ── Surface ─────────────────────────────────────
		omote.tint,
	],
	batchCount: [
		// ── Typography ──────────────────────────────────
		'text-sm font-medium whitespace-nowrap',
		// ── Tokens ──────────────────────────────────────
		sumi.textMuted,
	],
	loadingBody: 'flex items-center justify-center py-16',
	selectCell: 'w-px align-middle [line-height:0]',
	actionsCell: 'w-px whitespace-nowrap',
	sortButton: [
		// ── Layout ──────────────────────────────────────
		'inline-flex items-center',
		// ── Spacing ─────────────────────────────────────
		'gap-1',
		// ── Typography ──────────────────────────────────
		'select-none',
		// ── Tokens ──────────────────────────────────────
		sumi.textMuted,
		sumi.textHover,
		// ── Cursor ──────────────────────────────────────
		'cursor-pointer',
	],
	sortIcon: sumi.textMuted,
	sortIconActive: sumi.text,
	rowLoading: 'animate-pulse opacity-60',
}
