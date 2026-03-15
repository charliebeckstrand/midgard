'use client'

import { usePathname, useRouter } from 'next/navigation'

export function useChatActions() {
	const pathname = usePathname()
	const router = useRouter()

	function newChat() {
		const id = crypto.randomUUID()
		router.push(`/${id}?draft=true`)
	}

	async function deleteChat(chatId: string) {
		await fetch(`/api/chat/${chatId}`, { method: 'DELETE' }).catch(() => null)

		if (pathname === `/${chatId}`) {
			router.push('/')
		}

		router.refresh()
	}

	return { newChat, deleteChat }
}
