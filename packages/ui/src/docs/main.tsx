import { mount } from './engine/host'
import './app.css'

// The globs run here, in ui, so Vite resolves them against ui's own `demos/`
// tree; the engine wires the loaders into the site chrome. Every `.tsx` under
// `demos/` is a routed page except `layout.tsx` (a demo folder's tab chrome,
// globbed separately) and `_`-prefixed files or folders (shared helpers tab
// pages import).
mount({
	demos: import.meta.glob<import('react').ComponentType>(
		['./demos/**/*.tsx', '!./demos/**/layout.tsx', '!./demos/**/_*', '!./demos/**/_*/**'],
		{ import: 'Demo' },
	),
	layouts: import.meta.glob<import('./engine/registry').LayoutComponent>('./demos/**/layout.tsx', {
		import: 'Layout',
	}),
})
