import { mount } from 'docs/app'
import './app.css'

// The glob runs here, in ui, so Vite resolves it against ui's own `demos/`
// tree; the shared engine wires the loaders into the site chrome.
mount(
	import.meta.glob<import('react').ComponentType>(
		[
			'./demos/*.tsx',
			'./demos/pages/*.tsx',
			'./demos/providers/*.tsx',
			'./demos/modules/*.tsx',
			'./demos/modules/*/index.tsx',
		],
		{ import: 'Demo' },
	),
)
