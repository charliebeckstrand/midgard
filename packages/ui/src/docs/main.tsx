import { mount } from './engine/host'

// `index.html` links `app.css`, so the styles do not wait on this module
// graph. For the reason, see the comment on that `<link>`.
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
