'use client'

import { ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '../../../components/badge'
import { Button } from '../../../components/button'
import { Flex } from '../../../components/flex'
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
import type { PropDef } from '../types'
import { ReferencesPanel } from './references-panel'
import { TypeBadges } from './type-badges'

/**
 * Renders the Type column of the props table. Picks one of three modes:
 *
 *   - **External** (`externalFrom` set): one outline badge with a tooltip
 *     pointing to the source package — the type isn't authored here, so
 *     hover-to-source is more useful than splitting it into badges.
 *   - **References**: the type names one or more project-authored aliases —
 *     show the bare type and open a Sheet with the resolved definitions.
 *   - **Simple** (default): primitives / literals / unions thereof — render
 *     as plain badges via `TypeBadges`.
 */
export function TypeCell({ prop }: { prop: PropDef }) {
	const [open, setOpen] = useState(false)

	if (prop.externalFrom) {
		return (
			<Tooltip>
				<TooltipTrigger>
					<Badge variant="outline">{prop.type}</Badge>
				</TooltipTrigger>
				<TooltipContent>
					Type imported from <span className="font-semibold">{prop.externalFrom}</span>
				</TooltipContent>
			</Tooltip>
		)
	}

	const hasReferences = !!prop.references && Object.keys(prop.references).length > 0

	if (!hasReferences) {
		return <TypeBadges type={prop.type} />
	}

	return (
		<>
			<Flex gap="md" direction={{ initial: 'row', xl: 'col' }}>
				<Badge className="text-sm">{prop.type}</Badge>
				<Button variant="plain" size="sm" onClick={() => setOpen(true)}>
					View references
					<Icon icon={<ChevronRight />} />
				</Button>
			</Flex>
			<Glass>
				<Sheet open={open} onOpenChange={setOpen}>
					<SheetTitle className="font-mono">{prop.name}</SheetTitle>
					<SheetDescription className="font-mono">{prop.type}</SheetDescription>
					<SheetBody>
						<ReferencesPanel references={prop.references ?? {}} />
					</SheetBody>
					<SheetActions>
						<Button onClick={() => setOpen(false)}>Close</Button>
					</SheetActions>
				</Sheet>
			</Glass>
		</>
	)
}
