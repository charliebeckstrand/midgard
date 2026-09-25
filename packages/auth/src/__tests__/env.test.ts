import { describe, expect, it, vi } from 'vitest'

// `env.ts` reads the environment once, at load, and can throw there. Each case stubs the
// variables and loads a new instance of the module.
async function load(env: { BIFROST_URL?: string; NODE_ENV?: 'production' }): Promise<string> {
	vi.stubEnv('BIFROST_URL', env.BIFROST_URL)

	vi.stubEnv('NODE_ENV', env.NODE_ENV ?? 'test')

	vi.resetModules()

	const { BIFROST_URL } = await import('../env')

	return BIFROST_URL
}

describe('BIFROST_URL', () => {
	it('falls back to the local gateway outside production', async () => {
		await expect(load({})).resolves.toBe('http://localhost:4000')
	})

	it('reads BIFROST_URL', async () => {
		await expect(load({ BIFROST_URL: 'https://bifrost.example' })).resolves.toBe(
			'https://bifrost.example',
		)
	})

	it('removes a trailing slash and keeps a path prefix', async () => {
		await expect(load({ BIFROST_URL: 'https://bifrost.example/' })).resolves.toBe(
			'https://bifrost.example',
		)

		await expect(load({ BIFROST_URL: 'https://example.com/gateway/' })).resolves.toBe(
			'https://example.com/gateway',
		)
	})

	it('throws in production when BIFROST_URL is not set', async () => {
		await expect(load({ NODE_ENV: 'production' })).rejects.toThrow(/BIFROST_URL is not set/)
	})

	it.each(['localhost:4000', 'bifrost', '/gateway', 'ftp://bifrost.example'])(
		'throws on %s, which is not an absolute http or https URL',
		async (value) => {
			await expect(load({ BIFROST_URL: value })).rejects.toThrow(
				/not an absolute http or https URL/,
			)
		},
	)
})
