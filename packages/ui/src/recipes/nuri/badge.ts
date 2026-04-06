import {
	extend as paletteExtend,
	outline as paletteOutline,
	outlineHover as paletteOutlineHover,
	soft as paletteSoft,
	softHover as paletteSoftHover,
	solid as paletteSolid,
	solidHover as paletteSolidHover,
	withHover,
} from './palette'

// ── Base (5 colors, group-hover — shared by badge + chip) ─

export const soft = withHover(paletteSoft, paletteSoftHover, 'group-hover:')

export const solid = withHover(paletteSolid, paletteSolidHover, 'group-hover:')

export const outline = withHover(paletteOutline, paletteOutlineHover, 'group-hover:')

// ── Badge-specific (base + white/dark extended, group-hover) ─

export const badgeSolid = {
	...solid,
	...withHover(paletteExtend.solid, paletteExtend.solidHover, 'group-hover:'),
}

export const badgeSoft = {
	...soft,
	...withHover(paletteExtend.soft, paletteExtend.softHover, 'group-hover:'),
}
