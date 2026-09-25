import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { test } from 'node:test'

const envModule = JSON.stringify(new URL('./env.ts', import.meta.url).href)

type Env = { BIFROST_URL?: string; NODE_ENV?: 'production' }

// `env.ts` reads the environment once, at load, and can throw there. Each case loads it in a
// new process with only the given variables.
function load(env: Env): { url?: string; error?: string } {
	const child = spawnSync(
		process.execPath,
		[
			'--input-type=module',
			'--eval',
			`const { BIFROST_URL } = await import(${envModule}); process.stdout.write(BIFROST_URL)`,
		],
		// Next types `NODE_ENV` as required. A case without it tests the fallback outside production.
		{ env: env as NodeJS.ProcessEnv, encoding: 'utf8' },
	)

	return child.status === 0 ? { url: child.stdout } : { error: child.stderr }
}

test('falls back to the local gateway outside production', () => {
	assert.deepEqual(load({}), { url: 'http://localhost:4000' })
})

test('reads BIFROST_URL', () => {
	assert.deepEqual(load({ BIFROST_URL: 'https://bifrost.example' }), {
		url: 'https://bifrost.example',
	})
})

test('removes a trailing slash and keeps a path prefix', () => {
	assert.deepEqual(load({ BIFROST_URL: 'https://bifrost.example/' }), {
		url: 'https://bifrost.example',
	})

	assert.deepEqual(load({ BIFROST_URL: 'https://example.com/gateway/' }), {
		url: 'https://example.com/gateway',
	})
})

test('throws in production when BIFROST_URL is not set', () => {
	assert.match(load({ NODE_ENV: 'production' }).error ?? '', /BIFROST_URL is not set/)
})

test('throws on a value that is not an absolute http or https URL', () => {
	for (const value of ['localhost:4000', 'bifrost', '/gateway', 'ftp://bifrost.example']) {
		assert.match(
			load({ BIFROST_URL: value }).error ?? '',
			/not an absolute http or https URL/,
			value,
		)
	}
})
