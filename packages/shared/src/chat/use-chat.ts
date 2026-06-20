'use client'

import { usePathname, useRouter } from 'next/navigation'

type UseChatOptions = {
	onDelete?: () => void
}

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
