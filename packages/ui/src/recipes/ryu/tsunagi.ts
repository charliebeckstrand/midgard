/**
 * Tsunagi (繋ぎ) — Joined.
 *
 * Class fragments for items in a group (button group, toolbar, segmented
 * control). Position is stamped at runtime by the parent — via the `<Group>`
 * wrapper or `useGroup()` hook — as `data-group` and `data-group-orientation`
 * attributes.
 *
 * Uses Tailwind 4 logical-property classes (`rounded-s-*` / `rounded-e-*`,
 * `-ms-px`) so right-to-left layouts mirror without per-direction overrides.
 *
 * Layer: ryū · Concern: group joins
 */

export const tsunagi = {
	/**
	 * Spread into a kata's `tv()` base array to opt the component into the
	 * group system. Inactive when the parent doesn't stamp the `data-group`
	 * attribute, so participation is zero-cost when unused.
	 *
	 * Pseudo-element radii (`before:` / `after:`) are dropped alongside the
	 * outer radius so kasane consumers (Input, etc.) don't peek their inset
	 * fill or focus overlay through with rounded corners while the outer
	 * element is flat.
	 */
	base: [
		// Horizontal: 'start' loses its end-side radius, 'end' loses its start-side radius.
		'data-[group-orientation=horizontal]:data-[group=start]:rounded-e-none',
		'data-[group-orientation=horizontal]:data-[group=middle]:rounded-none',
		'data-[group-orientation=horizontal]:data-[group=end]:rounded-s-none',
		'data-[group-orientation=horizontal]:data-[group=start]:before:rounded-e-none',
		'data-[group-orientation=horizontal]:data-[group=middle]:before:rounded-none',
		'data-[group-orientation=horizontal]:data-[group=end]:before:rounded-s-none',
		'data-[group-orientation=horizontal]:data-[group=start]:after:rounded-e-none',
		'data-[group-orientation=horizontal]:data-[group=middle]:after:rounded-none',
		'data-[group-orientation=horizontal]:data-[group=end]:after:rounded-s-none',
		// Overlap by 1 px so adjacent borders don't double.
		'data-[group-orientation=horizontal]:data-[group=middle]:-ms-px',
		'data-[group-orientation=horizontal]:data-[group=end]:-ms-px',
		// Vertical: top/bottom don't flip in RTL.
		'data-[group-orientation=vertical]:data-[group=start]:rounded-b-none',
		'data-[group-orientation=vertical]:data-[group=middle]:rounded-none',
		'data-[group-orientation=vertical]:data-[group=end]:rounded-t-none',
		'data-[group-orientation=vertical]:data-[group=start]:before:rounded-b-none',
		'data-[group-orientation=vertical]:data-[group=middle]:before:rounded-none',
		'data-[group-orientation=vertical]:data-[group=end]:before:rounded-t-none',
		'data-[group-orientation=vertical]:data-[group=start]:after:rounded-b-none',
		'data-[group-orientation=vertical]:data-[group=middle]:after:rounded-none',
		'data-[group-orientation=vertical]:data-[group=end]:after:rounded-t-none',
		'data-[group-orientation=vertical]:data-[group=middle]:-mt-px',
		'data-[group-orientation=vertical]:data-[group=end]:-mt-px',
	],
} as const

export type GroupPosition = 'start' | 'middle' | 'end' | 'only'
export type GroupOrientation = 'horizontal' | 'vertical'
