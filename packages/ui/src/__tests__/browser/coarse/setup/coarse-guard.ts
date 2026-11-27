// The `coarse` instance of `vitest.browser.config.ts` opens its page with a
// touch screen (`COARSE_CONTEXT_OPTIONS`). Each case of `browser/coarse/` reads
// the layout of the real `(pointer: coarse)` rules. If the page does not match
// a coarse pointer, those cases read the layout of a mouse, and a case that
// checks a fine result could pass. This guard stops the file before its first
// case.
const conditions = ['(pointer: coarse)', '(any-pointer: coarse)', '(hover: none)']

const missing = conditions.filter((condition) => !matchMedia(condition).matches)

if (missing.length > 0) {
	throw new Error(
		`The coarse suite expects a touch screen; this page does not match ${missing.join(', ')}. ` +
			'Run the files of `browser/coarse/` in the `coarse` instance (`pnpm test:coarse`), ' +
			'whose page has `hasTouch` (`COARSE_CONTEXT_OPTIONS` in `vitest.browser.config.ts`).',
	)
}
