'use client'

import { ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '../../../components/badge'
import { Button } from '../../../components/button'
import { Glass } from '../../../components/glass'
import { Icon } from '../../../components/icon'
import {
	Sheet,
	SheetActions,
	SheetBody,
	SheetDescription,
	SheetTitle,
} from '../../../components/sheet'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../components/tooltip'
import { ReferencesPanel } from './api-reference-references-panel'
import { TypeBadges } from './api-reference-type-badges'

/**
 * Renders the Type cell of the props table. Simple types (primitives, literals,
 * and unions thereof) render as plain badges. External-from types render as a
 * single outline badge with a source tooltip. When the prop's type references
 * one or more named project types, the cell becomes a trigger that opens a
 * right-side Sheet with the referenced definitions.
 */
export function TypeCell({
	name,
	type,
	references,
	externalFrom,
}: {
	name: string
	type: string
	references?: Record<string, string>
	externalFrom?: string
}) {
	const [open, setOpen] = useState(false)

	if (externalFrom) {
		return (
			<Tooltip>
				<TooltipTrigger>
					<Badge variant="outline">{type}</Badge>
				</TooltipTrigger>
				<TooltipContent>
					Type imported from <span className="font-semibold">{externalFrom}</span>
				</TooltipContent>
			</Tooltip>
		)
	}

	const hasReferences = !!references && Object.keys(references).length > 0

	if (!hasReferences) {
		return <TypeBadges type={type} />
	}

	return (
		<>
			<Button
				variant="bare"
				aria-haspopup="dialog"
				aria-expanded={open}
				onClick={() => setOpen(true)}
			>
				<TypeBadges type={type} />
				<Icon icon={<ChevronRight />} />
			</Button>
			<Glass>
				<Sheet size="full" open={open} onOpenChange={setOpen}>
					<SheetTitle className="font-mono">{name}</SheetTitle>
					<SheetDescription className="font-mono">{type}</SheetDescription>
					<SheetBody>
						<ReferencesPanel references={references} />
					</SheetBody>
					<SheetActions>
						<Button onClick={() => setOpen(false)}>Close</Button>
					</SheetActions>
				</Sheet>
			</Glass>
		</>
	)
}
