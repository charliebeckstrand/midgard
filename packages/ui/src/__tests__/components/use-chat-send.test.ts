import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { type ChatTransport, useChatSend } from '../../modules/chat'

/** A transport that yields the given cumulative snapshots in order. */
function streamOf(...snapshots: string[]): ChatTransport {
	return () =>
		(async function* () {
			for (const snapshot of snapshots) yield snapshot
		})()
}

describe('useChatSend', () => {
	it('assigns client ids to seed messages', () => {
		const { result } = renderHook(() =>
			useChatSend({
				transport: streamOf('ok'),
				initialMessages: [{ role: 'user', content: 'seed' }],
			}),
		)

		expect(result.current.messages[0]?.id).toBeTypeOf('string')
	})

	it('appends the user message and streams the agent reply, keeping the last snapshot', async () => {
		const onSent = vi.fn()

		const { result } = renderHook(() =>
			useChatSend({ transport: streamOf('Hel', 'Hello'), onSent }),
		)

		await act(async () => {
			await result.current.send('hi')
		})

		expect(result.current.messages).toHaveLength(2)

		expect(result.current.messages[0]).toMatchObject({ role: 'user', content: 'hi' })

		expect(result.current.messages[1]).toMatchObject({ role: 'agent', content: 'Hello' })

		expect(result.current.sending).toBe(false)

		expect(onSent).toHaveBeenCalledWith('hi')
	})

	it('trims input and no-ops on empty content', async () => {
		const transport = vi.fn(streamOf('x'))

		const { result } = renderHook(() => useChatSend({ transport }))

		await act(async () => {
			await result.current.send('   ')
		})

		expect(transport).not.toHaveBeenCalled()

		expect(result.current.messages).toHaveLength(0)
	})

	it('rolls back the empty agent placeholder and keeps the user message on failure', async () => {
		const onError = vi.fn()

		const transport: ChatTransport = () =>
			// biome-ignore lint/correctness/useYield: throws before yielding to exercise the rollback path.
			(async function* () {
				throw new Error('boom')
			})()

		const { result } = renderHook(() => useChatSend({ transport, onError }))

		await act(async () => {
			await result.current.send('hi')
		})

		await waitFor(() => expect(onError).toHaveBeenCalled())

		expect(result.current.messages).toHaveLength(1)

		expect(result.current.messages[0]).toMatchObject({ role: 'user', content: 'hi' })

		expect(result.current.sending).toBe(false)
	})

	it('retry regenerates the reply to the last user message, dropping the previous reply', async () => {
		const transports = [streamOf('first reply'), streamOf('second reply')]

		let call = 0

		const transport: ChatTransport = (content) =>
			transports[call++]?.(content) ?? streamOf()(content)

		const { result } = renderHook(() => useChatSend({ transport }))

		await act(async () => {
			await result.current.send('hi')
		})

		expect(result.current.messages[1]).toMatchObject({ content: 'first reply' })

		await act(async () => {
			await result.current.retry()
		})

		expect(result.current.messages).toHaveLength(2)

		expect(result.current.messages[0]).toMatchObject({ role: 'user', content: 'hi' })

		expect(result.current.messages[1]).toMatchObject({ role: 'agent', content: 'second reply' })
	})

	it('retry resends after a failed send, with no prior agent reply to drop', async () => {
		let call = 0

		const transport: ChatTransport = (content) => {
			call += 1

			if (call === 1) {
				// biome-ignore lint/correctness/useYield: throws before yielding to exercise the failure path.
				return (async function* () {
					throw new Error('boom')
				})()
			}

			return streamOf('recovered')(content)
		}

		const { result } = renderHook(() => useChatSend({ transport }))

		await act(async () => {
			await result.current.send('hi')
		})

		expect(result.current.messages).toHaveLength(1)

		await act(async () => {
			await result.current.retry()
		})

		expect(result.current.messages).toHaveLength(2)

		expect(result.current.messages[1]).toMatchObject({ role: 'agent', content: 'recovered' })
	})

	it('retry no-ops with no user message in the transcript', async () => {
		const transport = vi.fn(streamOf('x'))

		const { result } = renderHook(() => useChatSend({ transport }))

		await act(async () => {
			await result.current.retry()
		})

		expect(transport).not.toHaveBeenCalled()

		expect(result.current.messages).toHaveLength(0)
	})

	it('edit replaces a user message and regenerates from there, dropping later turns', async () => {
		const transports = [streamOf('first reply'), streamOf('second reply')]

		let call = 0

		const transport: ChatTransport = (content) =>
			transports[call++]?.(content) ?? streamOf()(content)

		const { result } = renderHook(() => useChatSend({ transport }))

		await act(async () => {
			await result.current.send('hi')
		})

		const userId = result.current.messages[0]?.id as string

		await act(async () => {
			await result.current.edit(userId, 'edited message')
		})

		expect(result.current.messages).toHaveLength(2)

		expect(result.current.messages[0]).toMatchObject({ role: 'user', content: 'edited message' })

		expect(result.current.messages[1]).toMatchObject({ role: 'agent', content: 'second reply' })
	})

	it('edit no-ops for an unknown id, a non-user message, or empty content', async () => {
		const transport = vi.fn(streamOf('x'))

		const { result } = renderHook(() =>
			useChatSend({
				transport,
				initialMessages: [
					{ role: 'user', content: 'hi' },
					{ role: 'agent', content: 'hello' },
				],
			}),
		)

		const userId = result.current.messages[0]?.id as string

		const agentId = result.current.messages[1]?.id as string

		await act(async () => {
			await result.current.edit('unknown-id', 'x')
		})

		await act(async () => {
			await result.current.edit(agentId, 'x')
		})

		await act(async () => {
			await result.current.edit(userId, '   ')
		})

		expect(transport).not.toHaveBeenCalled()

		expect(result.current.messages).toHaveLength(2)

		expect(result.current.messages[0]).toMatchObject({ content: 'hi' })
	})

	it('send/retry/edit no-op while a send is already in flight', async () => {
		const calls: string[] = []

		let releaseTransport: (() => void) | undefined

		const transport: ChatTransport = (content) => {
			calls.push(content)

			return (async function* () {
				await new Promise<void>((resolve) => {
					releaseTransport = resolve
				})

				yield 'reply'
			})()
		}

		const { result } = renderHook(() => useChatSend({ transport }))

		let firstSend!: Promise<void>

		act(() => {
			firstSend = result.current.send('hi')
		})

		await waitFor(() => expect(result.current.sending).toBe(true))

		const userId = result.current.messages[0]?.id as string

		await act(async () => {
			await result.current.send('again')
		})

		await act(async () => {
			await result.current.retry()
		})

		await act(async () => {
			await result.current.edit(userId, 'edited')
		})

		// Only the original send reached the transport; retry/edit/the second
		// send all no-opped while it was still in flight.
		expect(calls).toEqual(['hi'])

		expect(result.current.messages[0]).toMatchObject({ content: 'hi' })

		releaseTransport?.()

		await act(async () => {
			await firstSend
		})

		expect(result.current.messages).toHaveLength(2)

		expect(result.current.messages[0]).toMatchObject({ content: 'hi' })

		expect(result.current.messages[1]).toMatchObject({ role: 'agent', content: 'reply' })
	})
})
