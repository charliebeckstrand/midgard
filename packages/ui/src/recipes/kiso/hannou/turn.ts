/**
 * Hannou turn: the quarter turn of a disclosure chevron that points to the
 * inline end. The chevron carries `data-open` itself. While it is open, the
 * chevron turns to point down. A right-to-left chevron mirrors, so it points to
 * the inline end, and turns counterclockwise, so it also points down when it
 * is open. CSS applies the rotate after the scale.
 *
 * The turn moves in the tempo of `ugoki.collapse` (`css.collapse`), so the
 * chevron turns in the time that the panel takes to open.
 *
 * Layer: kiso · Concern: disclosure chevron turn
 */

import { ugoki } from '../ugoki'

const { css } = ugoki

export const turn = [
	'rtl:-scale-x-100',
	'data-open:rotate-90',
	'rtl:data-open:-rotate-90',
	css.transform,
	css.collapse,
]
