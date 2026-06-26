import { defaultRegistry } from 'docs/derive-code'
import { describe, expect, it } from 'vitest'

// Integration: the docs engine, pointed at ui by the docs vite plugin (see
// vitest.config.ts), resolves ui's real components, providers, and demo
// externals into the name map that backs snippet-import resolution. This is
// ui-specific — the agnostic engine behaviour lives in the docs package.
describe('docs engine ⇄ ui component map', () => {
	it('is a Map keyed by component name', () => {
		expect(defaultRegistry.byName).toBeInstanceOf(Map)
	})

	it('resolves a known component name back to its module', () => {
		// `Button` is the canonical recognizable export; it lives in components/button.
		const info = defaultRegistry.byName.get('Button')

		expect(info?.name).toBe('Button')

		expect(info?.module).toBe('button')
	})

	it('resolves a provider name to its nested `providers/*` module', () => {
		// Providers carry the full nested specifier; derived imports read
		// `ui/providers/glass`, matching the package's `./providers/*` export map.
		const info = defaultRegistry.byName.get('GlassProvider')

		expect(info?.name).toBe('GlassProvider')

		expect(info?.module).toBe('providers/glass')
	})

	it('resolves a demo package import to an external entry', () => {
		// Demos import lucide icons (`Star` in the icon demo); the plugin records
		// them under their bare package specifier with the external mark.
		const info = defaultRegistry.byName.get('Star')

		expect(info).toEqual({ name: 'Star', module: 'lucide-react', external: true })
	})
})
