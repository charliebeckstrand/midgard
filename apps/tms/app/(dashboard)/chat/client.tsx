'use client'

import { CircleDashed } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from 'ui/button'
import { ChatPrompt } from 'ui/chat-prompt'
import { Flex } from 'ui/flex'
import { Icon } from 'ui/icon'

export default function ChatClient() {
	const router = useRouter()

	const [value, setValue] = useState('')

	function handleSubmit() {
		const content = value.trim()

		if (!content) return

		const chatId = crypto.randomUUID()

		const params = new URLSearchParams({ message: content })

		router.push(`/chat/${chatId}?${params.toString()}`)
	}

	return (
		<Flex align="center" justify="center" className="h-full w-full">
			<ChatPrompt
				value={value}
				onValueChange={setValue}
				onSubmit={handleSubmit}
				actions={
					<Button variant="plain" size="sm" prefix={<Icon icon={<CircleDashed />} />}>
						Data Analyst
					</Button>
				}
			/>
		</Flex>
	)
}
