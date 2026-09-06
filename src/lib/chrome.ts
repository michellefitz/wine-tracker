/**
 * The colours iOS paints outside the page, when the app is installed.
 *
 * A web app on the home screen has no browser chrome to hide behind. The strip
 * behind the clock is drawn by the system rather than by us, from the
 * theme-color meta tag, and whatever is in that tag is what shows there — so a
 * value that doesn't match the top of the page is a visible bar across the top
 * of the screen, which is exactly what it was.
 *
 * These are sRGB spellings of tokens authored in OKLCH, because a meta tag
 * can't read a CSS custom property. If the tokens in globals.css change, these
 * have to change with them, and so does the manifest.
 */

/** --color-paper. */
export const PAPER = "#ede6da";

/**
 * --color-ink at 20% over --color-paper: what the shelf looks like once a
 * sheet is over it, measured rather than guessed.
 */
export const SCRIMMED = "#c4bdb4";
