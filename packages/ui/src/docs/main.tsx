import { mount } from './engine/host'

// TEMPORARY: the tap log for PR #1404. Remove before merge.
if (location.search.includes('tapdebug')) void import('./tap-debug')

// `index.html` links `app.css`; an import here would delay the styles until
// this whole module graph loads. See `engine/README.md`.
//
// The glob runs here, in ui, so Vite resolves it against ui's own `demos/`
// tree; the engine wires the loaders into the site chrome.
mount(
	import.meta.glob<import('react').ComponentType>(
		[
			'./demos/components/*.tsx',
			'./demos/providers/*.tsx',
			'./demos/modules/*.tsx',
			'./demos/modules/*/index.tsx',
		],
		{ import: 'Demo' },
	),
)
