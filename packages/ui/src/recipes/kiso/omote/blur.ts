/**
 * Omote blur: backdrop-filter strengths used by the glass and popover
 * chromes and by the backdrop. `sm` is the blur of the backdrop
 * (`backdrop.ts`), and `lg` is the blur of a glass modal panel (`panel.ts`).
 *
 * Layer: kiso · Concern: backdrop blur
 */

export const blur = {
	sm: 'backdrop-blur-sm',
	md: 'backdrop-blur',
	lg: 'backdrop-blur-lg',
} as const
