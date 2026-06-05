import { extendTailwindMerge } from 'tailwind-merge'

/**
 * `tailwind-merge` extended with the project's named spacing scale
 * (`xs / sm / md / lg / xl`) so utilities like `p-md` collapse cleanly when a
 * later class overrides them. Shared by `cn` and the recipe engine so the two
 * configurations can never drift.
 */
export const twMerge = extendTailwindMerge({
	extend: {
		theme: {
			spacing: ['xs', 'sm', 'md', 'lg', 'xl'],
		},
	},
})
