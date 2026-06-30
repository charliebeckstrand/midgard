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
})
