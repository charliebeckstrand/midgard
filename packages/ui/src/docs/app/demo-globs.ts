// The demo files, relative to `src/docs`. `import.meta.glob` takes only
// literals, so `root.tsx` repeats this list; `react-router.config.ts` reads it
// to list the pages to render at build time.
export const DEMO_GLOBS = [
	'demos/components/*.tsx',
	'demos/primitives/*.tsx',
	'demos/providers/*.tsx',
	'demos/modules/*.tsx',
	'demos/modules/*/index.tsx',
	'demos/structure/*.tsx',
]
