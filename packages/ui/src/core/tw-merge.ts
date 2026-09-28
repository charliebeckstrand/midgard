import { type ClassValidator, extendTailwindMerge, validators } from 'tailwind-merge'
import { utilityTable } from './density/utility-table'

/** A stepped utility, such as `density-px`. */
type SteppedGroup = `density-${keyof typeof utilityTable}`

/** A stop of a ring utility: a number, as the ring utility takes it. */
const ringStop: ClassValidator[] = [validators.isNumber]

/** The value of a stepped utility: a list in brackets, such as `[2,3,4]`. */
const stepList: ClassValidator[] = [validators.isArbitraryValue]

const utilities = Object.entries(utilityTable).map(([name, entry]) => ({
	name,
	stepped: `density-${name}` as SteppedGroup,
	plain: 'group' in entry ? entry.group : name,
	ring: 'ring' in entry,
}))

/** The stepped group of each plain group, such as `density-px` for `px`. */
const steppedOf: Record<string, SteppedGroup | undefined> = Object.fromEntries(
	utilities.map(({ plain, stepped }) => [plain, stepped]),
)

/**
 * The class groups of the density utilities. Each stepped utility has a group
 * with its stepped ring form. Each plain ring utility joins the group of its
 * property, so a later `px-4` replaces a `px-ring-2`.
 */
const classGroups = Object.fromEntries(
	utilities.flatMap(({ name, stepped, plain, ring }) => [
		[stepped, [{ [stepped]: stepList, ...(ring ? { [`${stepped}-ring`]: stepList } : {}) }]],
		...(ring ? [[plain, [{ [`${name}-ring`]: ringStop }]]] : []),
	]),
)

/**
 * The conflicts of the stepped groups. They mirror the conflicts of
 * `tailwind-merge`, which `defaults` holds: a group that contains the plain
 * group of a property also contains its stepped group, and the stepped group of
 * a group contains what the plain group contains. A stepped group and its plain
 * group contain each other. So a later class replaces an earlier class of each
 * property that it covers, whether each class is stepped or plain.
 */
function steppedConflicts(
	defaults: Readonly<Record<string, readonly string[] | undefined>>,
): Record<string, string[]> {
	const conflicts: Record<string, string[]> = {}

	const add = (group: string, contained: readonly string[]) => {
		conflicts[group] = [...new Set([...(conflicts[group] ?? []), ...contained])]
	}

	for (const [group, contained = []] of Object.entries(defaults)) {
		const stepped = contained.flatMap((part) => steppedOf[part] ?? [])

		if (stepped.length > 0) add(group, stepped)

		const own = steppedOf[group]

		if (own) add(own, [...contained, ...stepped])
	}

	for (const { plain, stepped } of utilities) {
		add(stepped, [plain])

		add(plain, [stepped])
	}

	// `tailwind-merge` puts only `pr` and `pl` in `px`. The logical sides are part
	// of `padding-inline` too.
	add('density-px', ['ps', 'pe', 'density-ps', 'density-pe'])

	add('px', ['density-ps', 'density-pe'])

	// `density-text` writes `line-height: var(--tw-leading, …)`, so an earlier
	// `leading-*` still sets the line height, as a title's `leading-none` does.
	// The two classes compose, so the stepped class keeps it.
	conflicts['density-text'] =
		conflicts['density-text']?.filter((group) => group !== 'leading') ?? []

	return conflicts
}

/**
 * `tailwind-merge` extended with the project's named spacing scale
 * (`xs / sm / md / lg / xl`) and the density utilities of
 * `core/density/utility-table.ts`: the stepped utilities and the ring
 * utilities. Utilities like `p-md` collapse when a later class overrides them.
 * A later class replaces an earlier class of each property that it covers,
 * whether each class is stepped, plain, or a ring form. Shared by `cn` and the
 * recipe engine.
 *
 * The stepped conflicts join the config that `tailwind-merge` builds on the
 * first merge, so the default config is built once, and not at module load.
 */
export const twMerge = extendTailwindMerge<SteppedGroup>(
	{
		extend: {
			theme: {
				spacing: ['xs', 'sm', 'md', 'lg', 'xl'],
			},
			classGroups,
		},
	},
	(config) => {
		const groups: Record<string, readonly string[] | undefined> = config.conflictingClassGroups

		for (const [group, contained] of Object.entries(steppedConflicts(groups))) {
			groups[group] = [...(groups[group] ?? []), ...contained]
		}

		return config
	},
)
