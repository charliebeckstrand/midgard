import type { ClientChatMessage } from '../types'

type Props = Pick<ClientChatMessage, 'role' | 'content' | 'pending'>

export function Message({ role, content, pending }: Props) {
	return (
		<div className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'}`}>
			<div
				className={`max-w-[80%] rounded-lg px-4 py-2 ${
					role === 'user'
						? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
						: 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white'
				}`}
			>
				{pending ? (
					<div className="flex gap-1 items-center h-6">
						<span className="size-1.5 rounded-full bg-current animate-bounce [animation-delay:-0.3s]" />
						<span className="size-1.5 rounded-full bg-current animate-bounce [animation-delay:-0.15s]" />
						<span className="size-1.5 rounded-full bg-current animate-bounce" />
					</div>
				) : (
					<p className="whitespace-pre-wrap">{content}</p>
				)}
			</div>
		</div>
	)
}
