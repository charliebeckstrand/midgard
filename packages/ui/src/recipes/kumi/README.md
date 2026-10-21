# Kumi 組: Groups

> **Scope:** the shared structure of a family of units. A group holds slots, axes, and defaults in the shape of a unit. A kata unit extends its group, and adds its own slots and axes.

## 1. Contract

`kumi/` is internal. Only `kata/` reads it. A group reads the tokens of `kiso/` and the recipe engine (`defineGroup` from [`core/recipe`](../../core/recipe)). The `recipes/kumi/**` override in `biome.json` pins the direction.

A group is data, not a callable. `defineGroup(config, extras)` takes the config of a unit, and a unit builds the recipe when it extends the group. The config is the recipe of the root slot `base`, and `slots` holds the child slots:

```ts
export const input = defineGroup({
  extends: control,
  affixed: { true: [...], false: [] },
  slots: { field: 'block', suffix: 'shrink-0' },
  defaults: { affixed: false },
})

export const k = defineKata({ extends: input })
```

A group can extend a group. The merge is the same as the merge of a unit.

A fragment that only the units of a group read, and that is not a slot of each unit, is a named export of the group module, not an extra. An extra goes to each unit, and a unit that does not use it then carries it.

## 2. The merge

| Field | Rule |
|---|---|
| The classes of a slot, and of each value of an axis | The group first, then the unit. `tailwind-merge` lets the unit win a conflict. |
| A new slot, a new axis, or a new value | Added |
| Defaults | The unit wins for each prop |
| Compound rules | The group first, then the unit |
| Extras | Added; the unit wins for a name in both |
| Palette | A slot takes a palette from the group or from the unit. A palette in both throws. |

A unit cannot remove a class of its group, so the shared structure stays shared.

## 3. Groups

| Group | Slots and axes | Units |
|---|---|---|
| `control` (`control/`) | `base` (the frame), with the `variant` axis for the surface; `field`, `prefix`, `suffix` | `textarea`, and the groups below |
| `input` (`control/`) | Extends `control`: the `affixed` axis, and the touch gap of two controls in an affix | `input`, `number-input`, the `input` unit of `file-upload` |
| `trigger` (`control/`) | Extends `control`: each affix is a press target | The `list` and `picker` groups |
| `list` (`control/`) | Extends `trigger`: the `options` slot, and the `portal` extra | `listbox`, `combobox` |
| `picker` (`control/`) | Extends `trigger`: the `root` and `content` extras | `date-picker`, `color-picker` |
| `check` (`check/`) | `base` (the box), with the `color` axis; the hidden `input` | `checkbox`, `radio` |
| `slider` (`slider/`) | `base` (the track variable), with the `color` axis | `slider`, `slider-range` |
| `panel` (`panel/`) | `base` (the panel), with the `surface` axis; `backdrop`, `header`, `title`, `description`, `content`, `body`, `footer` | `dialog`, `drawer`, `sheet`, `panel` |
| `item` (`item/`) | `base` (the row chrome); `label`, `text`, `description`, `shortcut` | `option`, the `item` units of `menu` and `command-palette` |

## 4. Rules

- **Two units or more.** A group exists only when two units or more extend it, directly or through a group. The structure of one unit stays in its kata.
- **Japanese layer, English children.** The layer has a Japanese name, and each group and each key under it has an English name. A kiso family has a Japanese name ([`../kiso/README.md`](../kiso/README.md)).
- **No component parts in kiso.** A fragment that builds a part of a component, such as a frame, an affix, or a row, lives in its group, not in kiso.

---

**See also:** [`../README.md`](../README.md) · [`../kiso/README.md`](../kiso/README.md) · [`../kata/README.md`](../kata/README.md)
