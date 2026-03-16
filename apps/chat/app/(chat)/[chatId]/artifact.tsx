'use client'

import { AgCharts } from 'ag-charts-react'
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community'
import { AgGridReact } from 'ag-grid-react'
import { useMemo } from 'react'

import type { ToolCall } from '../types'

ModuleRegistry.registerModules([AllCommunityModule])

export function Artifact({ toolCall }: { toolCall: ToolCall }) {
	const parsed = useMemo(() => {
		try {
			return JSON.parse(toolCall.args)
		} catch {
			return null
		}
	}, [toolCall.args])

	if (!parsed) return null

	if (toolCall.name === 'CreateGrid') {
		return (
			<div className="h-[300px] w-full">
				<AgGridReact columnDefs={parsed.columnDefs} rowData={parsed.rowData} />
			</div>
		)
	}

	return (
		<AgCharts
			options={{
				title: parsed.title ? { text: parsed.title } : undefined,
				data: parsed.data,
				series: parsed.series,
				background: { visible: false },
			}}
			className="h-[300px] w-full"
		/>
	)
}
