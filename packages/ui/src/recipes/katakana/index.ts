/**
 * Katakana 片仮名: the bridge layer.
 *
 * Each archetype is a pure bridge function. It receives a kiso token
 * bundle from the calling kata, and wires it into the recipe surface the
 * kata exports. It imports only the recipe engine (`core/recipe`). A bridge
 * imports nothing from kiso, neither values nor types. It declares the token
 * shape it needs as its own contract, and takes the data by argument. The
 * "no kiso import" contract is pinned by the `recipes/katakana/**` override in
 * `biome.json`.
 *
 * Five archetypes, and two of them have bridges:
 *
 * - `control` and `check`, the Control family: text-input and check-input
 *   branches;
 * - `panel`, the panel bundle shared by Drawer and Sheet.
 *
 * `popover` has no bridge: `kata/popover` reads `kiso/popover` directly, as
 * the other floating kata do. `segment` has no bridge: Segment and Tabs share
 * it through one kata, `kata/tabs`, which reads kiso directly. `slider` has no
 * bridge either; it's a pure color token bundle the slider kata read from kiso
 * directly.
 * Alongside the archetypes, `backdrop` is a small shared recipe (not an
 * archetype) for the modal scrim of dialog, drawer, and sheet, and `palette` is
 * a shared palette wiring (not an archetype either).
 *
 * **The bridge is namespaced.** Bridges are reached through the `bridge`
 * object. A kata imports the token bundle under its bare archetype
 * name, and the bridge as `bridge.<archetype>` without an alias:
 *
 *     import { control } from '../kiso/control'
 *     import { bridge } from '../katakana'
 *     export const k = bridge.control(control, { base: 'block', slots: { … } })
 *
 * **What the barrel surfaces.** The `bridge` object only: the archetype
 * wirings, the `backdrop` shared recipe, and the `palette` wiring. That wiring
 * bundles an injected `iro` palette into the solid / soft / outline matrix the
 * chromatic surface kata share. The bridges are generic over the token
 * bundle they receive; variant types resolve from the concrete `k` at the
 * kata (`VariantProps<typeof k>`), not from the bridge. Engine primitives
 * (`defineRecipe`, `definePalette`, `VariantProps`, …) stay in `core/recipe`;
 * kata import them from there.
 */

import { backdrop } from './backdrop'
import { check, control } from './control'
import { palette } from './palette'
import { panel } from './panel'

export const bridge = { control, check, panel, backdrop, palette }
