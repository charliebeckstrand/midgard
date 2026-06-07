import { hannou, iro, kasane, narabi } from '../kiso'

const { fg } = hannou
const { text } = iro
const { rounded } = kasane
const { flex } = narabi

export const k = {
	// `min-w-6 min-h-6` floors the hit target at the WCAG 2.5.8 minimum (24px) as
	// a real, measurable border-box, centring the glyph inside it — the bare
	// variant's `::before` slop expands the pointer area too but is invisible to
	// the geometry gate (and to the spec's box metric). The floor only grows the
	// xs/sm/md steps (14/16/20px icons); lg's 24px icon already clears it.
	base: [
		'relative',
		flex.row,
		'items-center justify-center',
		'min-w-6 min-h-6',
		rounded.lg,
		text.muted,
		fg.hover,
		fg.focus,
	],
	transition:
		'transition-[opacity,filter,scale] duration-300 ease-in-out will-change-[opacity,filter,scale]',
	active: 'scale-100 opacity-100 blur-0',
	inactive: 'blur-xs scale-[0.25] opacity-0',
} as const
