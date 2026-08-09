import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { type ChatPart, type ChatTransport, useChatSend } from '../../modules/chat'

/** A transport that yields the given chunks in order: cumulative prose, or blocks. */
function streamOf(...chunks: (string | ChatPart[])[]): ChatTransport {
	return () =>
		(async function* () {
			for (const chunk of chunks) yield chunk
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

	it('keeps the id a seed message carries, so a reload does not re-key the transcript', () => {
		// The persisted id is what a React key, an `edit` call, and a part's
		// address all name. Minting a fresh one here would break every target
		// written before the reload.
		const { result } = renderHook(() =>
			useChatSend({
				transport: streamOf('ok'),
				initialMessages: [
					{ id: 'server-1', role: 'user', content: 'seed' },
					{ id: 'server-2', role: 'assistant', content: 'reply' },
				],
			}),
		)

		expect(result.current.messages.map((message) => message.id)).toEqual(['server-1', 'server-2'])
	})

	it('assigns an id only to the seed message that carries none', () => {
		const { result } = renderHook(() =>
			useChatSend({
				transport: streamOf('ok'),
				initialMessages: [
					{ id: 'server-1', role: 'user', content: 'seed' },
					{ role: 'assistant', content: 'reply' },
				],
			}),
		)

		expect(result.current.messages[0]?.id).toBe('server-1')
		expect(result.current.messages[1]?.id).toBeTypeOf('string')
		expect(result.current.messages[1]?.id).not.toBe('server-1')
	})

	it('warns once when two seed messages share an id, and leaves the transcript as it got it', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

		const { result, rerender } = renderHook(() =>
			useChatSend({
				transport: streamOf('ok'),
				initialMessages: [
					{ id: 'server-1', role: 'user', content: 'hi' },
					{ id: 'server-1', role: 'assistant', content: 'hello' },
				],
			}),
		)

		rerender()

		expect(warn).toHaveBeenCalledTimes(1)
		expect(warn.mock.calls[0]?.[0]).toContain('"server-1"')

		// The hook reports rather than repairs: a minted replacement would discard
		// the id a store persisted.
		expect(result.current.messages.map((message) => message.id)).toEqual(['server-1', 'server-1'])

		warn.mockRestore()
	})

	it('stays quiet when every seed message names itself', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

		renderHook(() =>
			useChatSend({
				transport: streamOf('ok'),
				initialMessages: [
					{ id: 'server-1', role: 'user', content: 'hi' },
					{ role: 'assistant', content: 'hello' },
				],
			}),
		)

		expect(warn).not.toHaveBeenCalled()

		warn.mockRestore()
	})

	it('edits a seed message by the id it was persisted under', async () => {
		// The end the fix exists for: a target written before a reload still
		// reaches its message after one.
		const transport = vi.fn(streamOf('x'))

		const { result } = renderHook(() =>
			useChatSend({
				transport,
				initialMessages: [{ id: 'server-1', role: 'user', content: 'seed' }],
			}),
		)

		await act(async () => {
			await result.current.edit('server-1', 'edited')
		})

		expect(transport).toHaveBeenCalledWith('edited', expect.anything())
		expect(result.current.messages[0]).toMatchObject({ id: 'server-1', content: 'edited' })
	})

	it('appends the user message and streams the assistant reply, keeping the last snapshot', async () => {
		const onSent = vi.fn()

		const { result } = renderHook(() =>
			useChatSend({ transport: streamOf('Hel', 'Hello'), onSent }),
		)

		await act(async () => {
			await result.current.send('hi')
		})

		expect(result.current.messages).toHaveLength(2)

		expect(result.current.messages[0]).toMatchObject({ role: 'user', content: 'hi' })

		expect(result.current.messages[1]).toMatchObject({ role: 'assistant', content: 'Hello' })

		expect(result.current.streaming).toBe(false)

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

	it('rolls back the empty assistant placeholder and keeps the user message on failure', async () => {
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

		expect(onError).toHaveBeenCalled()

		expect(result.current.messages).toHaveLength(1)

		expect(result.current.messages[0]).toMatchObject({ role: 'user', content: 'hi' })

		expect(result.current.streaming).toBe(false)
	})

	it('retry regenerates the reply to the last user message, dropping the previous reply', async () => {
		const transports = [streamOf('first reply'), streamOf('second reply')]

		let call = 0

		const transport: ChatTransport = (content, signal) =>
			transports[call++]?.(content, signal) ?? streamOf()(content, signal)

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

		expect(result.current.messages[1]).toMatchObject({ role: 'assistant', content: 'second reply' })
	})

	it('retry resends after a failed send, with no prior assistant reply to drop', async () => {
		let call = 0

		const transport: ChatTransport = (content, signal) => {
			call += 1

			if (call === 1) {
				// biome-ignore lint/correctness/useYield: throws before yielding to exercise the failure path.
				return (async function* () {
					throw new Error('boom')
				})()
			}

			return streamOf('recovered')(content, signal)
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

		expect(result.current.messages[1]).toMatchObject({ role: 'assistant', content: 'recovered' })
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

		const transport: ChatTransport = (content, signal) =>
			transports[call++]?.(content, signal) ?? streamOf()(content, signal)

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

		expect(result.current.messages[1]).toMatchObject({ role: 'assistant', content: 'second reply' })
	})

	it('edit no-ops for an unknown id, a non-user message, or empty content', async () => {
		const transport = vi.fn(streamOf('x'))

		const { result } = renderHook(() =>
			useChatSend({
				transport,
				initialMessages: [
					{ role: 'user', content: 'hi' },
					{ role: 'assistant', content: 'hello' },
				],
			}),
		)

		const userId = result.current.messages[0]?.id as string

		const assistantId = result.current.messages[1]?.id as string

		await act(async () => {
			await result.current.edit('unknown-id', 'x')
		})

		await act(async () => {
			await result.current.edit(assistantId, 'x')
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

		expect(result.current.streaming).toBe(true)

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

		expect(result.current.messages[1]).toMatchObject({ role: 'assistant', content: 'reply' })
	})

	it('stop aborts the in-flight send, keeping the last snapshot and skipping onError/onSent', async () => {
		const onError = vi.fn()

		const onSent = vi.fn()

		let capturedSignal: AbortSignal | undefined

		let yieldSecond: (() => void) | undefined

		const transport: ChatTransport = (_content, signal) => {
			capturedSignal = signal

			return (async function* () {
				yield 'first'

				await new Promise<void>((resolve) => {
					yieldSecond = resolve
				})

				yield 'second'
			})()
		}

		const { result } = renderHook(() => useChatSend({ transport, onError, onSent }))

		let sendPromise!: Promise<void>

		act(() => {
			sendPromise = result.current.send('hi')
		})

		await waitFor(() => expect(result.current.messages[1]).toMatchObject({ content: 'first' }))

		act(() => {
			result.current.stop()
		})

		expect(capturedSignal?.aborted).toBe(true)

		yieldSecond?.()

		await act(async () => {
			await sendPromise
		})

		// The second snapshot arrived after the stop, so it's dropped; the bubble
		// stays at the last snapshot applied before the abort.
		expect(result.current.messages[1]).toMatchObject({ content: 'first' })

		expect(result.current.streaming).toBe(false)

		expect(onError).not.toHaveBeenCalled()

		expect(onSent).not.toHaveBeenCalled()
	})

	it('stop no-ops when nothing is in flight', () => {
		const { result } = renderHook(() => useChatSend({ transport: streamOf('x') }))

		expect(() => result.current.stop()).not.toThrow()

		expect(result.current.streaming).toBe(false)
	})

	it('a send after a stopped send still completes normally', async () => {
		let releaseFirst: (() => void) | undefined

		let call = 0

		const transport: ChatTransport = (content, signal) => {
			call += 1

			if (call === 1) {
				return (async function* () {
					await new Promise<void>((resolve) => {
						releaseFirst = resolve
					})

					yield 'first reply'
				})()
			}

			return streamOf('second reply')(content, signal)
		}

		const { result } = renderHook(() => useChatSend({ transport }))

		let firstSend!: Promise<void>

		act(() => {
			firstSend = result.current.send('hi')
		})

		await waitFor(() => expect(result.current.streaming).toBe(true))

		act(() => {
			result.current.stop()
		})

		releaseFirst?.()

		await act(async () => {
			await firstSend
		})

		await act(async () => {
			await result.current.send('again')
		})

		expect(result.current.messages.at(-1)).toMatchObject({
			role: 'assistant',
			content: 'second reply',
		})

		expect(result.current.streaming).toBe(false)
	})
})

describe('useChatSend over a stream of parts', () => {
	const chart: ChatPart = { kind: 'embed', id: 'e1', name: 'stops-trend', data: [4, 14] }

	it('lands a reply that arrives as blocks alone', async () => {
		const { result } = renderHook(() => useChatSend({ transport: streamOf([chart]) }))

		await act(async () => {
			await result.current.send('how are stops trending?')
		})

		expect(result.current.messages.at(-1)).toMatchObject({
			role: 'assistant',
			content: [chart],
		})
	})

	it('keeps prose already streamed when a block arrives after it', async () => {
		const { result } = renderHook(() =>
			useChatSend({ transport: streamOf('Late stops rose.', [chart]) }),
		)

		await act(async () => {
			await result.current.send('how are stops trending?')
		})

		expect(result.current.messages.at(-1)?.content).toEqual([
			{ kind: 'text', id: 'text', text: 'Late stops rose.' },
			chart,
		])
	})

	it('keeps writing prose after a block, without touching it', async () => {
		// The whole point of the widening: one reply holds prose that streams
		// beside a chart that arrived once.
		const { result } = renderHook(() =>
			useChatSend({ transport: streamOf('Late stops', [chart], 'Late stops rose to 14.') }),
		)

		await act(async () => {
			await result.current.send('how are stops trending?')
		})

		expect(result.current.messages.at(-1)?.content).toEqual([
			{ kind: 'text', id: 'text', text: 'Late stops rose to 14.' },
			chart,
		])
	})

	it('leaves a string-only transport rendering exactly as it did', async () => {
		// The compatibility claim. A transport written before parts existed yields
		// strings, and the reply it builds stays a string.
		const { result } = renderHook(() => useChatSend({ transport: streamOf('Hel', 'Hello') }))

		await act(async () => {
			await result.current.send('hi')
		})

		expect(result.current.messages.at(-1)?.content).toBe('Hello')
	})

	it('rolls a failed send back when the reply arrived as no block at all', async () => {
		const transport: ChatTransport = () =>
			(async function* () {
				yield []

				throw new Error('gateway down')
			})()

		const { result } = renderHook(() => useChatSend({ transport, onError: () => {} }))

		await act(async () => {
			await result.current.send('hi')
		})

		expect(result.current.messages).toHaveLength(1)

		expect(result.current.messages[0]).toMatchObject({ role: 'user' })
	})

	it('keeps a reply that arrived as a block when the send then fails', async () => {
		// `isEmptyContent` reads structure, so a chart with no prose around it is a
		// reply that landed and the rollback must not discard it.
		const transport: ChatTransport = () =>
			(async function* () {
				yield [chart]

				throw new Error('gateway down')
			})()

		const { result } = renderHook(() => useChatSend({ transport, onError: () => {} }))

		await act(async () => {
			await result.current.send('hi')
		})

		expect(result.current.messages.at(-1)).toMatchObject({
			role: 'assistant',
			content: [chart],
		})
	})

	it('sends the prose of a block reply again on retry, dropping what it cannot carry', async () => {
		// `retry` re-sends the last *user* message, which holds prose, so the
		// projection is lossless here. Stated so the boundary is on the record.
		const transport = vi.fn(streamOf([chart]))

		const { result } = renderHook(() => useChatSend({ transport }))

		await act(async () => {
			await result.current.send('how are stops trending?')
		})

		await act(async () => {
			await result.current.retry()
		})

		expect(transport).toHaveBeenLastCalledWith('how are stops trending?', expect.anything())

		expect(result.current.messages.at(-1)).toMatchObject({ content: [chart] })
	})
})
