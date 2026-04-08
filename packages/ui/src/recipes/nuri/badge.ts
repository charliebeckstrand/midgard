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

// ── Base (5 colors + white/dark extended, group-hover — shared by badge + chip) ─

export const solid = {
	...withHover(paletteSolid, paletteSolidHover, 'group-hover:'),
	...withHover(paletteExtend.solid, paletteExtend.solidHover, 'group-hover:'),
}

export const soft = {
	...withHover(paletteSoft, paletteSoftHover, 'group-hover:'),
	...withHover(paletteExtend.soft, paletteExtend.softHover, 'group-hover:'),
}

export const outline = withHover(paletteOutline, paletteOutlineHover, 'group-hover:')
