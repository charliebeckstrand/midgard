export interface Chat {
	id: string
	title: string
}

export interface ChatMessage {
	role: 'user' | 'agent'
	content: string
}

export type ToolCallName =
	| 'CreateBarChart'
	| 'CreateLineChart'
	| 'CreateAreaChart'
	| 'CreateScatterChart'
	| 'CreateBubbleChart'
	| 'CreatePieChart'
	| 'CreateDonutChart'
	| 'CreateComboChart'
	| 'CreateGrid'

export interface ToolCall {
	id: string
	name: ToolCallName
	args: string
}

export interface ClientChatMessage extends ChatMessage {
	id: string
	pending?: boolean
	toolCalls?: ToolCall[]
}
