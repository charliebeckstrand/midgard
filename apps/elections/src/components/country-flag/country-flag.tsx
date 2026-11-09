import * as Flags from 'country-flag-icons/react/3x2'

/** A flag of the set, by its uppercase ISO 3166-1 alpha-2 code. */
type FlagCode = keyof typeof Flags

/** Whether a code names a flag of the set. */
function isFlagCode(code: string): code is FlagCode {
	return Object.hasOwn(Flags, code)
}

/**
 * The flag of a country, from `country-flag-icons`, as tall as a capital
 * letter of the text beside it (`1cap`). The flag sits beside the name of the country, which names it,
 * so the flag is hidden from a screen reader. A country with no flag in the
 * set renders nothing.
 *
 * @remarks The set holds a component for each flag. The level page renders the
 * flags on the server and passes them to the list, so the browser loads no
 * flag code.
 *
 * @param country - The lowercase ISO 3166-1 alpha-2 code, such as `us`.
 */
export function CountryFlag({ country }: { country: string }) {
	const code = country.toUpperCase()

	if (!isFlagCode(code)) return null

	// The code comes from the registry, so the flag is a lookup in the whole set.
	// Only the server renders this component, so the set does not go to the browser.
	// biome-ignore lint/performance/noDynamicNamespaceImportAccess: a server lookup by the code of the registry; no browser bundle holds the set
	const Flag = Flags[code]

	return (
		<Flag
			aria-hidden
			className="h-[1cap] w-auto shrink-0 rounded-xs outline -outline-offset-1 outline-zinc-950/10 dark:outline-white/10"
		/>
	)
}
