'use client'

import type { RefObject } from 'react'
import { createContext } from '../../core'
import type { VirtualItemSource } from '../../hooks/a11y/use-a11y-roving'

/**
 * Transport for `VirtualOptions` to publish its windowed item source up to an
 * ancestor's `useA11yRoving` call. The ancestor (`Combobox`, `CommandPalette`)
 * owns the roving hook and the ref it reads `itemSource` off of; it can't
 * consume a context its own descendant provides the normal way, so it hands
 * the ref itself down through this context instead, and `VirtualOptions`
 * writes into `.current` from an effect. `null` outside such an ancestor —
 * `VirtualOptions` then windows without registering a keyboard source, its
 * pre-existing DOM-only-roving behavior.
 *
 * @internal
 */
export const [VirtualItemSourceContext] = createContext<RefObject<VirtualItemSource | null> | null>(
	'VirtualItemSource',
	{ default: null },
)
