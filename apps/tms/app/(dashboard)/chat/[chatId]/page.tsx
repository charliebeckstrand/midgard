import ChatIdClient from './client'

export default async function ChatIdPage({ params }: { params: Promise<{ chatId: string }> }) {
	const { chatId } = await params

	return <ChatIdClient chatId={chatId} />
}
