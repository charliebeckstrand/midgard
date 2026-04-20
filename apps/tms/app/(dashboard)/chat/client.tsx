'use client'

import { CircleDashed } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from 'ui/button'
import { ChatPrompt } from 'ui/chat-prompt'
import { Flex } from 'ui/flex'
import { Icon } from 'ui/icon'
import { Sizer } from 'ui/sizer'

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
			<Sizer size="md">
				<ChatPrompt
					value={value}
					onValueChange={setValue}
					onSubmit={handleSubmit}
					actions={
						<Button variant="plain" size="sm">
							<Icon icon={<CircleDashed />} />
							<span className="ml-1">Data Analyst</span>
						</Button>
					}
				/>
			</Sizer>
		</Flex>
	)
}
