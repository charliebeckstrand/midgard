import { describe, expect, it } from 'vitest'
import { withAuth } from '../config'
import { BIFROST_URL } from '../env'

const gatewayRewrites = [
	{ source: '/auth/:path*', destination: `${BIFROST_URL}/auth/:path*` },
	{ source: '/api/:path*', destination: `${BIFROST_URL}/api/:path*` },
]

const userRewrite = { source: '/old', destination: '/new' }

describe('withAuth', () => {
	it('adds the gateway rewrites to a config without rewrites', async () => {
		await expect(withAuth().rewrites?.()).resolves.toEqual(gatewayRewrites)
	})

	it('keeps the other fields of the config', () => {
		expect(withAuth({ devIndicators: false }).devIndicators).toBe(false)
	})

	it('puts the gateway rewrites after an array of rewrites', async () => {
		const config = withAuth({ rewrites: async () => [userRewrite] })

		await expect(config.rewrites?.()).resolves.toEqual([userRewrite, ...gatewayRewrites])
	})

	it('puts the gateway rewrites in the afterFiles of the object form', async () => {
		const config = withAuth({
			rewrites: async () => ({
				beforeFiles: [userRewrite],
				afterFiles: [userRewrite],
				fallback: [userRewrite],
			}),
		})

		await expect(config.rewrites?.()).resolves.toEqual({
			beforeFiles: [userRewrite],
			afterFiles: [userRewrite, ...gatewayRewrites],
			fallback: [userRewrite],
		})
	})

	it('adds afterFiles when the object form has none', async () => {
		const config = withAuth({ rewrites: async () => ({ fallback: [userRewrite] }) })

		await expect(config.rewrites?.()).resolves.toEqual({
			afterFiles: gatewayRewrites,
			fallback: [userRewrite],
		})
	})
})
