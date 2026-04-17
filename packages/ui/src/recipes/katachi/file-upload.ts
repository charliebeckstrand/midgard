import { ki } from '../ki'
import { maru } from '../maru'
import { sumi } from '../sumi'

export const fileUpload = {
	dropzone: [
		// ── Layout ──────────────────────────────────────
		'flex flex-col items-center justify-center',
		'gap-3',
		// ── Typography ──────────────────────────────────
		'text-sm',
		// ── Tokens ──────────────────────────────────────
		maru.rounded,
		ki.ring,
		sumi.textMuted,
		// ── Border ──────────────────────────────────────
		'border border-dashed',
		'border-zinc-300',
		'dark:border-zinc-700',
		// ── Cursor ──────────────────────────────────────
		'cursor-pointer',
		// ── Hover ───────────────────────────────────────
		'hover:not-disabled:border-zinc-400',
		'dark:hover:not-disabled:border-zinc-500',
		// ── Drag-over ───────────────────────────────────
		'data-[drag-over]:border-blue-500',
		'dark:data-[drag-over]:border-blue-400',
		'data-[drag-over]:bg-blue-50/50',
		'dark:data-[drag-over]:bg-blue-950/20',
		// ── Disabled ────────────────────────────────────
		'disabled:opacity-50',
		'disabled:cursor-not-allowed',
	],
	icon: 'shrink-0',
	label: ['font-medium', sumi.text],
}
