/**
 * Tsunagi (繋ぎ) — Joined.
 *
 * Class fragments for items in an attached group (button group, toolbar,
 * segmented control). Position is stamped at runtime by the parent — via the
 * `<Attached>` wrapper or `useAttached()` hook — as `data-attached` and
 * `data-attached-orientation` attributes.
 *
 * Uses Tailwind 4 logical-property classes (`rounded-s-*` / `rounded-e-*`,
 * `-ms-px`) so right-to-left layouts mirror without per-direction overrides.
 *
 * Layer: ryū · Concern: attached-group joins
 */

export const tsunagi = {
	/**
	 * Spread into a kata's `tv()` base array to opt the component into the
	 * attached-group system. Inactive when the parent doesn't stamp the
	 * `data-attached` attribute, so participation is zero-cost when unused.
	 */
	base: [
		// Horizontal: 'start' loses its end-side radius, 'end' loses its start-side radius.
		'data-[attached-orientation=horizontal]:data-[attached=start]:rounded-e-none',
		'data-[attached-orientation=horizontal]:data-[attached=middle]:rounded-none',
		'data-[attached-orientation=horizontal]:data-[attached=end]:rounded-s-none',
		// Overlap by 1 px so adjacent borders don't double.
		'data-[attached-orientation=horizontal]:data-[attached=middle]:-ms-px',
		'data-[attached-orientation=horizontal]:data-[attached=end]:-ms-px',
		// Vertical: top/bottom don't flip in RTL.
		'data-[attached-orientation=vertical]:data-[attached=start]:rounded-b-none',
		'data-[attached-orientation=vertical]:data-[attached=middle]:rounded-none',
		'data-[attached-orientation=vertical]:data-[attached=end]:rounded-t-none',
		'data-[attached-orientation=vertical]:data-[attached=middle]:-mt-px',
		'data-[attached-orientation=vertical]:data-[attached=end]:-mt-px',
	],
} as const

export type AttachedPosition = 'start' | 'middle' | 'end' | 'only'
export type AttachedOrientation = 'horizontal' | 'vertical'
