/**
 * Ma (間) — interval.
 *
 * The named spacing scale shared by padding, margin, and gap. `stops`
 * carries the raw `--spacing` numerals; `p` / `m` / `gap` (and their
 * directional siblings) carry full Tailwind utilities keyed by the same
 * label set, so consumers reach a finished class string by name and the
 * JIT scanner sees every utility in source.
 *
 * The label set lives outside `--spacing-*` so semantic sizes
 * (`sm` / `md` / `lg`) don't shadow Tailwind's width/height scales
 * (`max-w-sm`, `w-md`). Most components land on `sm` / `md` / `lg`; the
 * ends cover edge cases (compact chrome, page-level layout).
 *
 * Layer: kiso · Concern: spacing
 */

const stops = {
	xs: '1',
	sm: '2',
	md: '3',
	lg: '4',
	xl: '6',
} as const

export type Ma = keyof typeof stops

const p = {
	xs: 'p-1',
	sm: 'p-2',
	md: 'p-3',
	lg: 'p-4',
	xl: 'p-6',
} as const satisfies Record<Ma, string>

const px = {
	xs: 'px-1',
	sm: 'px-2',
	md: 'px-3',
	lg: 'px-4',
	xl: 'px-6',
} as const satisfies Record<Ma, string>

const py = {
	xs: 'py-1',
	sm: 'py-2',
	md: 'py-3',
	lg: 'py-4',
	xl: 'py-6',
} as const satisfies Record<Ma, string>

const pl = {
	xs: 'pl-1',
	sm: 'pl-2',
	md: 'pl-3',
	lg: 'pl-4',
	xl: 'pl-6',
} as const satisfies Record<Ma, string>

const pr = {
	xs: 'pr-1',
	sm: 'pr-2',
	md: 'pr-3',
	lg: 'pr-4',
	xl: 'pr-6',
} as const satisfies Record<Ma, string>

const pt = {
	xs: 'pt-1',
	sm: 'pt-2',
	md: 'pt-3',
	lg: 'pt-4',
	xl: 'pt-6',
} as const satisfies Record<Ma, string>

const pb = {
	xs: 'pb-1',
	sm: 'pb-2',
	md: 'pb-3',
	lg: 'pb-4',
	xl: 'pb-6',
} as const satisfies Record<Ma, string>

const m = {
	xs: 'm-1',
	sm: 'm-2',
	md: 'm-3',
	lg: 'm-4',
	xl: 'm-6',
} as const satisfies Record<Ma, string>

const mx = {
	xs: 'mx-1',
	sm: 'mx-2',
	md: 'mx-3',
	lg: 'mx-4',
	xl: 'mx-6',
} as const satisfies Record<Ma, string>

const my = {
	xs: 'my-1',
	sm: 'my-2',
	md: 'my-3',
	lg: 'my-4',
	xl: 'my-6',
} as const satisfies Record<Ma, string>

const ml = {
	xs: 'ml-1',
	sm: 'ml-2',
	md: 'ml-3',
	lg: 'ml-4',
	xl: 'ml-6',
} as const satisfies Record<Ma, string>

const mr = {
	xs: 'mr-1',
	sm: 'mr-2',
	md: 'mr-3',
	lg: 'mr-4',
	xl: 'mr-6',
} as const satisfies Record<Ma, string>

const mt = {
	xs: 'mt-1',
	sm: 'mt-2',
	md: 'mt-3',
	lg: 'mt-4',
	xl: 'mt-6',
} as const satisfies Record<Ma, string>

const mb = {
	xs: 'mb-1',
	sm: 'mb-2',
	md: 'mb-3',
	lg: 'mb-4',
	xl: 'mb-6',
} as const satisfies Record<Ma, string>

const gap = {
	xs: 'gap-1',
	sm: 'gap-2',
	md: 'gap-3',
	lg: 'gap-4',
	xl: 'gap-6',
} as const satisfies Record<Ma, string>

const gapX = {
	xs: 'gap-x-1',
	sm: 'gap-x-2',
	md: 'gap-x-3',
	lg: 'gap-x-4',
	xl: 'gap-x-6',
} as const satisfies Record<Ma, string>

const gapY = {
	xs: 'gap-y-1',
	sm: 'gap-y-2',
	md: 'gap-y-3',
	lg: 'gap-y-4',
	xl: 'gap-y-6',
} as const satisfies Record<Ma, string>

export const ma = {
	stops,
	p,
	px,
	py,
	pl,
	pr,
	pt,
	pb,
	m,
	mx,
	my,
	ml,
	mr,
	mt,
	mb,
	gap,
	gapX,
	gapY,
} as const
