/**
 * The palette colour sets.
 *
 * `colors` is the **standard** palette every chromatic kata carries by
 * default. Its values are semantic roles, not hues: each role's classes
 * resolve through the token ramps declared in `src/theme.css`
 * (`--color-neutral-*` … `--color-primary-*`), which alias the stock
 * Tailwind hues (zinc / red / amber / green / blue) until a consumer theme
 * overrides them. `extendedColors` is an **opt-in** set of decorative accent
 * hues a kata pulls in through `iro.spectrum`; accents are deliberately
 * untokenised. The recipe engine derives a palette's `color` axis from the
 * keys of the matrix it's handed (`engine/palette.ts`), so a kata that reads
 * the wider bundle gains the extra values with no engine change.
 *
 * Adding a standard role: append to `colors`, declare its ramp in
 * `src/theme.css`, then add a row to every per-colour map in `iro/*`. Adding
 * an extended colour: append to `extendedColors` and add its rows to
 * `iro/extended-palette.ts`.
 */

export const colors = ['neutral', 'danger', 'warning', 'success', 'primary'] as const

/** A standard palette role, available on every chromatic component. */
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

/** The full opt-in palette: every standard role plus the extended set. */
export type PaletteColor = Color | ExtendedColor
