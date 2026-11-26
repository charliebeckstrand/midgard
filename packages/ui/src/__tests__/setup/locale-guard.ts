// Dozens of assertions read the runtime locale: `Intl.NumberFormat` through
// `utilities/format-number.ts`, which binds the default deliberately, as much as
// the date surfaces. Node resolves ICU's default at process start, so the pin
// has to precede it and cannot live in `vitest.shared.mts` beside `TZ`; the
// package's `test` scripts export it. Running vitest by any other route (`npx
// vitest`, an IDE runner, a debugger launch) skips them, so fail once and say
// why rather than let the locale assertions fail for no visible reason.
//
// The time zone has the same check. `vitest.shared.mts` sets `TZ` when the
// config loads, and the browser suite gives the zone to each page. A run that
// misses the pin passes only on a machine that is already on UTC, and the date
// assertions fail on other machines with no visible cause.
//
// Shared by the jsdom setup (`index.ts`), the `pure` and `geometry` projects,
// which do not run the jsdom setup, and the browser suite.
const { locale, timeZone } = new Intl.DateTimeFormat().resolvedOptions()

if (locale !== 'en-US') {
	throw new Error(
		`Tests expect the en-US runtime locale; this process resolved ${locale}. ` +
			'Run through the package scripts (`pnpm test`), or set LANG=en-US before ' +
			'starting Node. Assigning process.env.LANG later cannot move it. ' +
			'In the browser suite, `vitest.browser.config.ts` gives `locale` to each page.',
	)
}

if (timeZone !== 'UTC') {
	throw new Error(
		`Tests expect the UTC time zone; this run resolved ${timeZone}. ` +
			'`vitest.shared.mts` sets process.env.TZ when the config loads, and ' +
			'`vitest.browser.config.ts` gives `timezoneId` to each page. Load the ' +
			'config through one of the package configs.',
	)
}
