export const formControl = {
	base: ['rounded-lg'],
	/**
	 * Standalone-skeleton default. A form-control placeholder applied outside
	 * a `<Group>` fills its parent (matching the typical real-mode behavior of
	 * a form control with `w-full` ancestry like `ControlFrame`).
	 */
	full: ['w-full'],
	/**
	 * Group-skeleton default. Inside a `<Group>` the placeholder has no
	 * intrinsic content to size from, so we can't mirror the real control's
	 * content-driven width. Default to growing (so sibling placeholders share
	 * the row) with a size-aware floor so the skeleton stays visible even
	 * when a sibling claims the rest of the row. Consumers can still override
	 * via `className` — e.g. `w-44 flex-none` to pin a fixed slot.
	 */
	group: {
		sm: 'flex-1 min-w-16',
		md: 'flex-1 min-w-24',
		lg: 'flex-1 min-w-32',
	},
	size: {
		sm: 'h-7.5',
		md: 'h-9.5',
		lg: 'h-11.5',
	},
	defaults: { size: 'md' as const },
}
