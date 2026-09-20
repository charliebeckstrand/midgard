// Dozens of assertions read the runtime locale — `Intl.NumberFormat` through
// `utilities/format-number.ts`, which binds the default deliberately, as much as
// the date surfaces. Node resolves ICU's default at process start, so the pin
// has to precede it and cannot live in `vitest.config.ts` beside `TZ`; the
// package's `test` scripts export it. Running vitest by any other route — `npx
// vitest`, an IDE runner, a debugger launch — skips them, so fail once and say
// why rather than let ~78 assertions fail for no visible reason.
//
// Shared by the jsdom setup (`index.ts`) and the `pure` project, which runs no
// other setup: the format tests live there.
const locale = new Intl.DateTimeFormat().resolvedOptions().locale

if (locale !== 'en-US') {
	throw new Error(
		`Tests expect the en-US runtime locale; this process resolved ${locale}. ` +
			'Run through the package scripts (`pnpm test`), or set LANG=en-US before ' +
			'starting Node — assigning process.env.LANG later cannot move it.',
	)
}
