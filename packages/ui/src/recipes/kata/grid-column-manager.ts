import { hannou, iro, narabi, sen } from '../kiso'

const { cursor, fg } = hannou
const { text } = iro
const { flex } = narabi
const { divider, focus } = sen

export const k = {
	root: [flex.col, 'gap-2'],
	// Leading slot for a frozen row, occupying (and aligned to) where an orderable
	// row's drag grip sits — `px-3 -ml-3 -mr-3` — so the checkboxes line up across
	// the prepended, scrolling, and appended groups.
	lead: [flex.inline, 'flex-none', 'justify-center', 'px-3', '-ml-3', '-mr-3'],
	// Interactive pin control — the per-row menu trigger that pins left/right or
	// unpins. Muted at rest, tinting on hover/focus like the header's pin button.
	pinButton: [flex.inline, 'shrink-0', text.muted, fg.hover, focus.ring, cursor, 'select-none'],
	// Static, non-interactive glyph: the lock icon on a locked row (an immutable
	// freeze), or the pin indicator on a frozen row when the manager has no pin
	// handler. Muted, matching the resting tint of the interactive control.
	icon: [flex.inline, 'shrink-0', text.muted],
	footer: [flex.row, 'justify-end', 'gap-1', 'pt-2', ...divider.top],
} as const
