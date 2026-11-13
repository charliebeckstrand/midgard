// @vitest-environment node
import { Agent, get, type IncomingMessage, type ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { type AppServerOptions, createAppServer } from '../server/serve-next'

let cleanup: (() => void) | undefined

afterEach(() => cleanup?.())

/** A compression layer that passes each request through. */
const pass = (_request: IncomingMessage, _response: ServerResponse, next: () => void) => next()

/** Starts an app server on a free port, with a keep-alive time far past the test. */
async function start(overrides: Partial<AppServerOptions> = {}) {
	const options: AppServerOptions = {
		handle: async (_request, response) => {
			response.end('ok')
		},
		compress: pass,
		close: vi.fn(async () => {}),
		exit: vi.fn(),
		...overrides,
	}

	const { server, stop } = createAppServer(options)

	server.keepAliveTimeout = 60_000

	await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))

	const agent = new Agent({ keepAlive: true, maxSockets: 1 })

	cleanup = () => {
		agent.destroy()

		server.closeAllConnections()

		server.close()
	}

	return { server, stop, options, agent, port: (server.address() as AddressInfo).port }
}

/** Sends one request, and resolves with its status and body. */
function request(port: number, agent: Agent): Promise<{ status: number; body: string }> {
	return new Promise((resolve, reject) => {
		get({ port, host: '127.0.0.1', agent }, (reply) => {
			const chunks: Buffer[] = []

			reply.on('data', (chunk: Buffer) => chunks.push(chunk))

			reply.on('end', () =>
				resolve({ status: reply.statusCode ?? 0, body: Buffer.concat(chunks).toString() }),
			)
		}).on('error', reject)
	})
}

describe('createAppServer', () => {
	it('answers a request that the handler fails with a 500', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {})

		const { port, agent } = await start({ handle: () => Promise.reject(new Error('boom')) })

		expect(await request(port, agent)).toEqual({ status: 500, body: 'Internal Server Error' })
	})

	it('closes Next and exits with the code of the signal after a stop', async () => {
		const { server, stop, options, port, agent } = await start()

		await request(port, agent)

		stop(143)

		await vi.waitFor(() => expect(options.exit).toHaveBeenCalledWith(143))

		expect(options.close).toHaveBeenCalledOnce()

		expect(server.listening).toBe(false)
	})

	// A load balancer keeps its connections open and sends on them without a
	// pause. The stop must not wait for a pause that does not come.
	it('stops while a keep-alive connection keeps sending requests', async () => {
		const { stop, options, port, agent } = await start({
			handle: async (_request, response) => {
				await new Promise((resolve) => setTimeout(resolve, 5))

				response.end('ok')
			},
		})

		let sending = true

		const traffic = (async () => {
			while (sending) await request(port, agent).catch(() => undefined)
		})()

		await new Promise((resolve) => setTimeout(resolve, 30))

		stop(143)

		await vi.waitFor(() => expect(options.exit).toHaveBeenCalledWith(143), { timeout: 2000 })

		sending = false

		await traffic
	})
})
