import { Download, Printer } from 'lucide-react'
import { Button } from '../button'
import { Icon } from '../icon'
import { ToolbarGroup } from '../toolbar'
import { Tooltip, TooltipContent, TooltipTrigger } from '../tooltip'
import { downloadPdf, printPdf } from './pdf-viewer-utilities'

type PdfViewerDocumentActionsProps = {
	src: string
	filename?: string
	disabled: boolean
}

export function PdfViewerDocumentActions({
	src,
	filename,
	disabled,
}: PdfViewerDocumentActionsProps) {
	const download = () => downloadPdf(src, filename)

	const print = () => printPdf(src)

	return (
		<ToolbarGroup aria-label="Document">
			<Tooltip>
				<TooltipTrigger>
					<Button variant="plain" aria-label="Download" disabled={disabled} onClick={download}>
						<Icon icon={<Download />} />
					</Button>
				</TooltipTrigger>
				<TooltipContent>Download</TooltipContent>
			</Tooltip>
			<Tooltip>
				<TooltipTrigger>
					<Button variant="plain" aria-label="Print" disabled={disabled} onClick={print}>
						<Icon icon={<Printer />} />
					</Button>
				</TooltipTrigger>
				<TooltipContent>Print</TooltipContent>
			</Tooltip>
		</ToolbarGroup>
	)
}
