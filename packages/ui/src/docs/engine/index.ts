// The demo-authoring kit: everything a library's `demos/` import to compose
// examples. A demo renders `<Example>` around live components, and `<Axes>`
// generates the examples of each styling axis from the extracted API; the listboxes,
// stepper, and labeled rows drive the interactive controls; `code` and the
// format helpers shape inline snippets and labels.

export { code } from './code'
export type { AxisProps, AxisRender } from './components/axes'
export { Axes } from './components/axes'
export { Example } from './components/example'
export { capitalize, humanize, sizeLabels, valueLabel } from './components/format'
export { LabeledColumn, LabeledRow, LabeledRows } from './components/labeled'
export { Opener } from './components/opener'
export { OptionsListbox } from './components/options-listbox'
export { SizeListbox } from './components/size-listbox'
export { ValueStepper } from './components/value-stepper'
export { VariantListbox } from './components/variant-listbox'
