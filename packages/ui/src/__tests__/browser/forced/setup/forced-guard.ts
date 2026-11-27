// The `forced-light` and the `forced-dark` instances of `vitest.browser.config.ts`
// open their page with forced colors (`FORCED_CONTEXT_OPTIONS`). Each case of
// `browser/forced/` reads what forced colors paint. If the page does not match
// forced colors, those cases read the author colors, and a case that checks an
// edge that the author colors also draw could pass. This guard stops the file
// before its first case.
//
// The guard reads the media query and not a system color. Under the light
// forced palette, `Canvas` and `CanvasText` have the values that they have with
// no forced colors.
if (!matchMedia('(forced-colors: active)').matches) {
	throw new Error(
		'The forced suite expects forced colors; this page does not match (forced-colors: active). ' +
			'Run the files of `browser/forced/` in the `forced-light` and the `forced-dark` instances ' +
			'(`pnpm test:forced`), whose page has `forcedColors` (`FORCED_CONTEXT_OPTIONS` in ' +
			'`vitest.browser.config.ts`).',
	)
}
