/**
 * The parts of a chat: a transcript, message bubbles, a prompt, and a list of
 * conversations.
 *
 * @packageDocumentation
 */

export type { ChatMessageVariants } from '../../recipes/kata/chat-message'
export {
	ChatCitationProvider,
	type ChatCitationProviderProps,
} from './chat-citation-provider'
export { ChatEmbedProvider, type ChatEmbedProviderProps } from './chat-embed-provider'
export { ChatList, type ChatListProps } from './chat-list'
export { ChatListItem, type ChatListItemProps } from './chat-list-item'
export { ChatMessage, type ChatMessageProps } from './chat-message'
export { ChatPrompt, type ChatPromptProps, type ChatPromptWysiwygOptions } from './chat-prompt'
export { ChatTranscript, type ChatTranscriptProps } from './chat-transcript'
export {
	ChatTranscriptSkeleton,
	type ChatTranscriptSkeletonProps,
} from './chat-transcript-skeleton'
export type { ChatBranch } from './engine/chat-branch/types'
export {
	type ChatStopSelection,
	toCategorySelection,
	toRegionSelection,
	toStopSelection,
} from './engine/chat-citation'
export { chatContentText } from './engine/chat-content/text'
export type {
	ChatActionField,
	ChatActionInput,
	ChatActionOption,
	ChatActionPart,
	ChatActionResult,
	ChatCitation,
	ChatEmbedPart,
	ChatPart,
	ChatTextPart,
	ChatToolPart,
	ChatToolStatus,
} from './engine/chat-content/types'
export type { ChatMessageData, ChatReplyChunk, ChatRevision } from './engine/types'
export type {
	ChatCitationTarget,
	ChatCitationTargets,
	ChatEmbedRegistry,
	ChatEmbedRenderer,
	ChatPromptItem,
	ChatPromptSource,
} from './types'
export type {
	ChatCitationTrigger,
	ChatCitationTriggerInput,
} from './use-chat-citation-trigger'
export { type ChatDraft, type ChatDraftOptions, useChatDraft } from './use-chat-draft'
export {
	type ChatSend,
	type ChatSendOptions,
	type ChatTransport,
	type ChatTransportMessage,
	useChatSend,
} from './use-chat-send'
