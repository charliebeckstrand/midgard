import { extendTailwindMerge, validators } from 'tailwind-merge'

/** A stop of a ring utility: a number, as the ring plugin takes it. */
const ringStop = [validators.isNumber]

/** The value of a stepped utility: a list in brackets, such as `[2,3,4]`. */
const steps = [validators.isArbitraryValue]

/**
 * The class group of each stepped utility. A stepped ring utility is in the
 * group of its property.
 */
const steppedGroups = {
	'density-p': [{ 'density-p': steps, 'density-p-ring': steps }],
	'density-px': [{ 'density-px': steps, 'density-px-ring': steps }],
	'density-py': [{ 'density-py': steps, 'density-py-ring': steps }],
	'density-pt': [{ 'density-pt': steps }],
	'density-pb': [{ 'density-pb': steps }],
	'density-ps': [{ 'density-ps': steps, 'density-ps-ring': steps }],
	'density-pe': [{ 'density-pe': steps, 'density-pe-ring': steps }],
	'density-ms': [{ 'density-ms-ring': steps }],
	'density-me': [{ 'density-me-ring': steps }],
	'density-gap': [{ 'density-gap': steps }],
	'density-gap-x': [{ 'density-gap-x': steps }],
	'density-gap-y': [{ 'density-gap-y': steps }],
	'density-size': [{ 'density-size': steps }],
	'density-h': [{ 'density-h': steps }],
	'density-max-h': [{ 'density-max-h': steps }],
	'density-w': [{ 'density-w': steps }],
	'density-text': [{ 'density-text': steps }],
	'density-rounded': [{ 'density-rounded': steps, 'density-rounded-ring': steps }],
}

/**
 * The plain class group of each stepped group. A stepped class and a plain class
 * of the same property conflict, so the later class stays.
 */
const plainGroups = {
	'density-p': 'p',
	'density-px': 'px',
	'density-py': 'py',
	'density-pt': 'pt',
	'density-pb': 'pb',
	'density-ps': 'ps',
	'density-pe': 'pe',
	'density-ms': 'ms',
	'density-me': 'me',
	'density-gap': 'gap',
	'density-gap-x': 'gap-x',
	'density-gap-y': 'gap-y',
	'density-size': 'size',
	'density-h': 'h',
	'density-max-h': 'max-h',
	'density-w': 'w',
	'density-text': 'font-size',
	'density-rounded': 'rounded',
} as const satisfies Record<keyof typeof steppedGroups, string>

/** The conflicts of each stepped group with the stepped groups it contains. */
const steppedConflicts: Partial<
	Record<keyof typeof steppedGroups, (keyof typeof steppedGroups)[]>
> = {
	'density-p': ['density-px', 'density-py', 'density-pt', 'density-pb', 'density-ps', 'density-pe'],
	'density-px': ['density-ps', 'density-pe'],
	'density-py': ['density-pt', 'density-pb'],
	'density-gap': ['density-gap-x', 'density-gap-y'],
	'density-size': ['density-h', 'density-w'],
}

/**
 * The conflicts of each stepped group: the stepped groups it contains, and its
 * plain group. Each plain group also conflicts with its stepped group.
 */
const conflicts = Object.fromEntries(
	Object.entries(plainGroups).flatMap(([stepped, plain]) => [
		[stepped, [...(steppedConflicts[stepped as keyof typeof steppedGroups] ?? []), plain]],
		[plain, [stepped]],
	]),
)

/**
 * `tailwind-merge` extended with the project's named spacing scale
 * (`xs / sm / md / lg / xl`), the ring utilities of
 * `kiso/kasane/ring-utilities.ts`, and the stepped utilities of density.
 * Utilities like `p-md` collapse when a later class overrides them. Each ring
 * utility joins the class group of its property, so a later `px-4` replaces a
 * `px-ring-2`. Each stepped utility has a group of its property,
 * so a later `density-px-[2,3,4]` replaces an earlier one. A stepped class and a
 * plain class of one property also replace each other. Shared by `cn` and the
 * recipe engine.
 */
export const twMerge = extendTailwindMerge<keyof typeof steppedGroups>({
	extend: {
		theme: {
			spacing: ['xs', 'sm', 'md', 'lg', 'xl'],
		},
		classGroups: {
			p: [{ 'p-ring': ringStop }],
			px: [{ 'px-ring': ringStop }],
			py: [{ 'py-ring': ringStop }],
			ps: [{ 'ps-ring': ringStop }],
			pe: [{ 'pe-ring': ringStop }],
			ms: [{ 'ms-ring': ringStop }],
			me: [{ 'me-ring': ringStop }],
			rounded: [{ 'rounded-ring': ringStop }],
			...steppedGroups,
		},
		conflictingClassGroups: conflicts,
	},
})
