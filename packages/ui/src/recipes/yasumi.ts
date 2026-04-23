/**
 * @deprecated Use `sawari.disabled` instead. This shim exists only to keep
 * existing imports working during the recipe-system migration; it will be
 * removed in the cleanup phase.
 */

import { sawari } from './sawari'

export const yasumi = { disabled: sawari.disabled } as const
