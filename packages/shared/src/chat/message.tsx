import type { ChatContent } from './types'

type Props = Pick<ChatContent, 'role' | 'content'>

export function ChatMessage({ role, content }: Props) {
	return (
		<div className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'}`}>
			<div
				className={`max-w-[80%] rounded-lg px-4 py-2 ${
					role === 'user'
						? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
						: 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white'
				}`}
			>
				<p className="whitespace-pre-wrap">{content}</p>
			</div>
		</div>
	)
}
