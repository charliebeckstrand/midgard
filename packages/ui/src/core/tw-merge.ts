import { extendTailwindMerge } from 'tailwind-merge'

/**
 * `tailwind-merge` extended with the project's named spacing scale
 * (`xs / sm / md / lg / xl`). Utilities like `p-md` collapse when a later
 * class overrides them. Shared by `cn` and the recipe engine.
 */
export const twMerge = extendTailwindMerge({
	extend: {
		theme: {
			spacing: ['xs', 'sm', 'md', 'lg', 'xl'],
		},
	},
})
