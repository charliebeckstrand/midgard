/**
 * Ma (間) — interval.
 *
 * The named spacing scale shared by padding, margin, and gap. Each label
 * maps to a Tailwind numeric spacing token; layout primitives compose
 * Tailwind-native utilities through a static `Record<Ma, string>` lookup
 * (e.g. `paddingMap[size]` in `Box/variants.ts`), so the JIT scanner
 * always sees concrete classes. The label set lives outside `--spacing-*`
 * so semantic sizes (`sm`/`md`/`lg`) don't shadow Tailwind's width/height
 * scales (`max-w-sm`, `w-md`). Most components land on `sm` / `md` / `lg`;
 * the ends cover edge cases (compact chrome, page-level layout).
 *
 * Layer: kiso · Concern: spacing
 */

export const ma = {
	xs: '1',
	sm: '2',
	md: '3',
	lg: '4',
	xl: '6',
} as const

export type Ma = keyof typeof ma
