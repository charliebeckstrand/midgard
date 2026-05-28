/**
 * Kasane 重ね — layered chrome plus its companion spacing helpers.
 *
 * The 4-layer chrome stack (`base` / `inset` / `overlay` / `hover` /
 * `focus` / `validation` / `disabled` / `all`) is the library's
 * signature inset-fill-plus-rings primitive — see `layers.ts`. The
 * ring-compensated `p` / `px` / `py` / `pl` / `pr` helpers and the
 * `r` / `ri` / `ro` / `radius` / `rounded` helpers sit alongside in
 * `padding.ts` and `radius.ts` because they exist to keep the inset fill
 * pixel-aligned with the outer ring. The `g` / `gx` / `gy` gap helpers
 * are pass-throughs that live here for symmetry with the rest of the
 * spacing surface.
 */

import { g, gx, gy } from './gap'
import { all, base, disabled, focus, hover, inset, overlay, validation } from './layers'
import { p, pl, pr, px, py } from './padding'
import { r, radius, ri, ro, rounded } from './radius'

export const kasane = {
	base,
	inset,
	overlay,
	hover,
	focus,
	validation,
	disabled,
	all,
	p,
	px,
	py,
	pl,
	pr,
	r,
	ri,
	ro,
	radius,
	rounded,
	g,
	gx,
	gy,
} as const
