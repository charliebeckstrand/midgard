import { describe, expect, it } from 'vitest'
import { securityHeaders, withAuth } from '../config'
import { BIFROST_URL } from '../env'

const gatewayRewrites = [{ source: '/auth/:path*', destination: `${BIFROST_URL}/auth/:path*` }]

const apiRewrite = { source: '/api/:path*', destination: `${BIFROST_URL}/api/:path*` }

const userRewrite = { source: '/old', destination: '/new' }

describe('withAuth', () => {
	it('adds the gateway rewrites to a config without rewrites', async () => {
		await expect(withAuth().rewrites?.()).resolves.toEqual({ fallback: gatewayRewrites })
	})

	it('rewrites `/api/*` to the gateway only with gatewayApi', async () => {
		await expect(withAuth({}, { gatewayApi: true }).rewrites?.()).resolves.toEqual({
			fallback: [...gatewayRewrites, apiRewrite],
		})
	})

	it('sends the security headers on every path, before the headers of the config', async () => {
		const own = { source: '/fonts/:path*', headers: [{ key: 'Cache-Control', value: 'public' }] }

		await expect(withAuth().headers?.()).resolves.toEqual([
			{ source: '/:path*', headers: securityHeaders },
		])

		await expect(withAuth({ headers: async () => [own] }).headers?.()).resolves.toEqual([
			{ source: '/:path*', headers: securityHeaders },
			own,
		])
	})

	it('keeps the other fields of the config', () => {
		expect(withAuth({ devIndicators: false }).devIndicators).toBe(false)
	})

	it('keeps an array of rewrites in afterFiles and puts the gateway rewrites in fallback', async () => {
		const config = withAuth({ rewrites: async () => [userRewrite] })

		await expect(config.rewrites?.()).resolves.toEqual({
			afterFiles: [userRewrite],
			fallback: gatewayRewrites,
		})
	})

	it('puts the gateway rewrites after the fallback of the object form', async () => {
		const config = withAuth({
			rewrites: async () => ({
				beforeFiles: [userRewrite],
				afterFiles: [userRewrite],
				fallback: [userRewrite],
			}),
		})

		await expect(config.rewrites?.()).resolves.toEqual({
			beforeFiles: [userRewrite],
			afterFiles: [userRewrite],
			fallback: [userRewrite, ...gatewayRewrites],
		})
	})

	it('adds fallback when the object form has none', async () => {
		const config = withAuth({ rewrites: async () => ({ afterFiles: [userRewrite] }) })

		await expect(config.rewrites?.()).resolves.toEqual({
			afterFiles: [userRewrite],
			fallback: gatewayRewrites,
		})
	})
})
