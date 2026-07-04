/**
 * The palette colour sets.
 *
 * `colors` is the **standard** palette every chromatic kata carries by
 * default; `extendedColors` is an **opt-in** set a kata pulls in through
 * `iro.spectrum`. The recipe engine derives a palette's `color` axis from
 * the keys of the matrix it's handed (`engine/palette.ts`), so a kata that
 * reads the wider bundle gains the extra values with no engine change.
 *
 * Adding a standard colour: append to `colors`, then add a row to every
 * per-colour map in `iro/*`. Adding an extended colour: append to
 * `extendedColors` and add its rows to `iro/extended-palette.ts`.
 */

export const colors = ['zinc', 'red', 'amber', 'green', 'blue'] as const

/** A standard palette colour, available on every chromatic component. */
export type Color = (typeof colors)[number]

/**
 * The extended palette: opt-in chromatic choices a kata surfaces by reading
 * `iro.extendedPalette`. Not part of the {@link Color standard set}; a
 * component offers these only when its kata declares the wider palette (e.g.
 * Badge).
 */
export const extendedColors = ['rose', 'violet', 'sky'] as const

/** An extended palette colour. @see {@link extendedColors} */
export type ExtendedColor = (typeof extendedColors)[number]

/** The full opt-in palette: every standard colour plus the extended set. */
export type PaletteColor = Color | ExtendedColor
