export { TagInput, type TagInputProps } from './tag-input'
// The tokenizer and the partition, not the announcements. What a pasted list IS, and which of its
// tokens a field can take, are general facts that any token-taking control needs — a `multiple`
// Combobox whose values are typed in rather than picked has to answer both, and answered them with
// its own loop until this was exported. `describeBatch` stays in: a live-region sentence is this
// field's own voice, and a control with different affordances would say something else.
export { classifyTokens, splitTokens, type TokenBatch } from './tag-input-utilities'
