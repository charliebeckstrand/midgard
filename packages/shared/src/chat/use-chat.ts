'use client'

import { usePathname, useRouter } from 'next/navigation'

type UseChatOptions = {
	/** Called after a chat is deleted (e.g. to refresh a list). */
	onDelete?: () => void
}

/**
 * Chat navigation actions: start a new draft chat, or delete one.
 *
 * @remarks
 * `newChat` routes to a fresh client-generated id with `?draft=true` (no server
 * write until the first message). `deleteChat` calls `DELETE /api/chat/:id` and,
 * if the deleted chat is the current route, navigates home.
 *
 * @param options - See {@link UseChatOptions}.
 * @returns `{ newChat, deleteChat }`.
 */
export function useChat(options?: UseChatOptions) {
	const pathname = usePathname()
	const router = useRouter()

	function newChat() {
		const id = crypto.randomUUID()

		router.push(`/${id}?draft=true`)
	}

	async function deleteChat(id: string) {
		const res = await fetch(`/api/chat/${id}`, { method: 'DELETE' }).catch(() => null)

		if (!res?.ok) return

		if (pathname === `/${id}`) {
			router.push('/')
		}

		options?.onDelete?.()
	}

	return { newChat, deleteChat }
}
