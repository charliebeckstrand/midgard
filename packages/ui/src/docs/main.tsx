import { mount } from './engine/host'

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
			'./demos/structure/*.tsx',
		],
		{ import: 'Demo' },
	),
)

// The tap log loads only at `?taplog`, so the entry chunk does not carry it.
if (new URLSearchParams(window.location.search).has('taplog'))
	void import('./engine/tap-log').then(({ mountTapLog }) => mountTapLog())
