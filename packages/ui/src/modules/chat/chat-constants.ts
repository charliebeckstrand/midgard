/**
 * The number of levels that the Markdown of a message adds to each heading. The
 * app does not write the content of a message, so a `#` heading in it must not
 * add an `<h1>` to the page. With `1`, it renders as an `<h2>`. The look of the
 * heading does not change.
 *
 * @internal
 */
export const MESSAGE_HEADING_OFFSET = 1
