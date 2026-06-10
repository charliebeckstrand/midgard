/**
 * Shaku panel: max-width scale for dialogs and sheets. All breakpoints
 * gate on `sm:`; the panel fills the viewport on phones and caps at
 * the named size from `sm` up.
 *
 * Layer: kiso · Concern: panel max-width
 */

export const panel = {
	xs: 'sm:max-w-xs',
	sm: 'sm:max-w-sm',
	md: 'sm:max-w-md',
	lg: 'sm:max-w-lg',
	xl: 'sm:max-w-xl',
	'2xl': 'sm:max-w-2xl',
	'3xl': 'sm:max-w-3xl',
	'4xl': 'sm:max-w-4xl',
	'5xl': 'sm:max-w-5xl',
	'6xl': 'sm:max-w-6xl',
	'7xl': 'sm:max-w-7xl',
	full: 'sm:max-w-full',
} as const
