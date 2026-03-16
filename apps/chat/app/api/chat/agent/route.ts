import type { BaseEvent } from '@ag-ui/core'
import { EventType } from '@ag-ui/core'
import { EventEncoder } from '@ag-ui/encoder'

import type { ChatMessage, ToolCallName } from '../../../(chat)/types'

const TOOL_CALLS: Array<{ name: ToolCallName; args: () => object }> = [
	{
		name: 'CreateBarChart',
		args: () => ({
			title: 'Quarterly Revenue',
			data: [
				{ quarter: 'Q1', revenue: 420, expenses: 310 },
				{ quarter: 'Q2', revenue: 530, expenses: 350 },
				{ quarter: 'Q3', revenue: 480, expenses: 330 },
				{ quarter: 'Q4', revenue: 620, expenses: 390 },
			],
			series: [
				{ type: 'bar', xKey: 'quarter', yKey: 'revenue', yName: 'Revenue' },
				{ type: 'bar', xKey: 'quarter', yKey: 'expenses', yName: 'Expenses' },
			],
		}),
	},
	{
		name: 'CreateLineChart',
		args: () => ({
			title: 'Monthly Active Users',
			data: [
				{ month: 'Jan', users: 1200 },
				{ month: 'Feb', users: 1350 },
				{ month: 'Mar', users: 1500 },
				{ month: 'Apr', users: 1420 },
				{ month: 'May', users: 1680 },
				{ month: 'Jun', users: 1900 },
			],
			series: [{ type: 'line', xKey: 'month', yKey: 'users', yName: 'Users' }],
		}),
	},
	{
		name: 'CreateAreaChart',
		args: () => ({
			title: 'CPU Usage Over Time',
			data: [
				{ time: '00:00', usage: 25 },
				{ time: '04:00', usage: 15 },
				{ time: '08:00', usage: 55 },
				{ time: '12:00', usage: 72 },
				{ time: '16:00', usage: 68 },
				{ time: '20:00', usage: 40 },
			],
			series: [{ type: 'area', xKey: 'time', yKey: 'usage', yName: 'CPU %' }],
		}),
	},
	{
		name: 'CreateScatterChart',
		args: () => ({
			title: 'Height vs Weight',
			data: [
				{ height: 160, weight: 55 },
				{ height: 170, weight: 68 },
				{ height: 175, weight: 72 },
				{ height: 180, weight: 80 },
				{ height: 165, weight: 60 },
				{ height: 185, weight: 85 },
			],
			series: [{ type: 'scatter', xKey: 'height', yKey: 'weight', yName: 'People' }],
		}),
	},
	{
		name: 'CreateBubbleChart',
		args: () => ({
			title: 'Market Analysis',
			data: [
				{ revenue: 100, growth: 20, marketShare: 15 },
				{ revenue: 200, growth: 10, marketShare: 25 },
				{ revenue: 150, growth: 30, marketShare: 10 },
				{ revenue: 300, growth: 5, marketShare: 35 },
			],
			series: [
				{
					type: 'bubble',
					xKey: 'revenue',
					yKey: 'growth',
					sizeKey: 'marketShare',
					yName: 'Growth',
				},
			],
		}),
	},
	{
		name: 'CreatePieChart',
		args: () => ({
			title: 'Browser Market Share',
			data: [
				{ browser: 'Chrome', share: 65 },
				{ browser: 'Safari', share: 18 },
				{ browser: 'Firefox', share: 8 },
				{ browser: 'Edge', share: 5 },
				{ browser: 'Other', share: 4 },
			],
			series: [{ type: 'pie', angleKey: 'share', legendItemKey: 'browser' }],
		}),
	},
	{
		name: 'CreateDonutChart',
		args: () => ({
			title: 'Task Status',
			data: [
				{ status: 'Done', count: 42 },
				{ status: 'In Progress', count: 15 },
				{ status: 'To Do', count: 23 },
				{ status: 'Blocked', count: 5 },
			],
			series: [
				{ type: 'donut', angleKey: 'count', legendItemKey: 'status', innerRadiusRatio: 0.6 },
			],
		}),
	},
	{
		name: 'CreateComboChart',
		args: () => ({
			title: 'Sales & Conversion Rate',
			data: [
				{ month: 'Jan', sales: 200, rate: 3.2 },
				{ month: 'Feb', sales: 250, rate: 3.5 },
				{ month: 'Mar', sales: 320, rate: 4.1 },
				{ month: 'Apr', sales: 280, rate: 3.8 },
			],
			series: [
				{ type: 'bar', xKey: 'month', yKey: 'sales', yName: 'Sales' },
				{ type: 'line', xKey: 'month', yKey: 'rate', yName: 'Conv. Rate' },
			],
		}),
	},
	{
		name: 'CreateGrid',
		args: () => ({
			columnDefs: [
				{ field: 'name', headerName: 'Name' },
				{ field: 'role', headerName: 'Role' },
				{ field: 'department', headerName: 'Department' },
				{ field: 'salary', headerName: 'Salary', type: 'numericColumn' },
			],
			rowData: [
				{ name: 'Alice Chen', role: 'Engineer', department: 'Platform', salary: 135000 },
				{ name: 'Bob Park', role: 'Designer', department: 'Product', salary: 120000 },
				{ name: 'Carol Wu', role: 'PM', department: 'Product', salary: 140000 },
				{ name: 'Dan Lee', role: 'Engineer', department: 'Data', salary: 130000 },
				{ name: 'Eve Kim', role: 'Lead', department: 'Platform', salary: 160000 },
			],
		}),
	},
]

function pickRandom() {
	return TOOL_CALLS[Math.floor(Math.random() * TOOL_CALLS.length)]
}

export async function POST(request: Request) {
	const body = (await request.json()) as { messages: ChatMessage[] }

	const messages = body.messages ?? []
	const lastUserMessage = [...messages].reverse().find((m: ChatMessage) => m.role === 'user')
	const response = `This is a simulated agent response to: "${lastUserMessage?.content ?? ''}"`

	const encoder = new EventEncoder()
	const textEncoder = new TextEncoder()
	const runId = crypto.randomUUID()
	const messageId = crypto.randomUUID()

	const words = response.split(/(\s+)/)
	const toolCall = pickRandom()
	const toolCallId = crypto.randomUUID()

	const stream = new ReadableStream({
		async start(controller) {
			function send(event: BaseEvent) {
				controller.enqueue(textEncoder.encode(encoder.encodeSSE(event)))
			}

			send({ type: EventType.RUN_STARTED, threadId: '', runId } as BaseEvent)

			send({
				type: EventType.TEXT_MESSAGE_START,
				messageId,
				role: 'assistant',
			} as BaseEvent)

			for (const word of words) {
				send({
					type: EventType.TEXT_MESSAGE_CONTENT,
					messageId,
					delta: word,
				} as BaseEvent)

				await new Promise((resolve) => setTimeout(resolve, 30))
			}

			send({ type: EventType.TEXT_MESSAGE_END, messageId } as BaseEvent)

			// Emit a random tool call
			send({
				type: EventType.TOOL_CALL_START,
				toolCallId,
				toolCallName: toolCall.name,
				parentMessageId: messageId,
			} as BaseEvent)

			send({
				type: EventType.TOOL_CALL_ARGS,
				toolCallId,
				delta: JSON.stringify(toolCall.args()),
			} as BaseEvent)

			send({
				type: EventType.TOOL_CALL_END,
				toolCallId,
			} as BaseEvent)

			send({ type: EventType.RUN_FINISHED, threadId: '', runId } as BaseEvent)

			controller.close()
		},
	})

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive',
		},
	})
}
