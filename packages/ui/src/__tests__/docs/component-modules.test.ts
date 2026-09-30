// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { defaultRegistry } from '../../docs/engine/derive-code'

// Integration: the docs engine, pointed at ui by the docs vite plugin (see
// vitest.config.ts), resolves ui's real components, providers, and demo
// externals into the name map that backs snippet-import resolution. This is
// ui-specific — the agnostic engine behavior lives under src/docs/engine/__tests__.
describe('docs engine ⇄ ui component map', () => {
	it.each([
		// `Button` is the canonical recognizable export; it lives in components/button.
		['a known component name back to its module', 'Button', 'button'],
		// Providers carry the full nested specifier; derived imports read
		// `ui/providers/glass`, matching the package's `./providers/*` export map.
		['a provider name to its nested `providers/*` module', 'GlassProvider', 'providers/glass'],
		// Modules carry the canonical nested specifier; derived imports read
		// `ui/modules/map`. The bare `ui/map` shorthand also resolves.
		['a module name to its nested `modules/*` module', 'MapPlat', 'modules/map'],
	])('resolves %s', (_name, name, module) => {
		expect(defaultRegistry.byName.get(name)).toMatchObject({ name, module })
	})

	it('resolves a demo package import to an external entry', () => {
		// Demos import lucide icons (`Star` in the icon demo); the plugin records
		// them under their bare package specifier with the external mark.
		const info = defaultRegistry.byName.get('Star')

		expect(info).toEqual({ name: 'Star', module: 'lucide-react', external: true })
	})
})
