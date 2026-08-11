/**
 * Breaking model prose into paragraphs.
 *
 * The first version asked the model for blank lines and split on them. It came
 * back as one block anyway — a structured-output field has no reason to carry
 * newlines, and asking nicely isn't a mechanism. So the breaks are made here,
 * from the sentences, and the model's own paragraphing is honoured when it
 * happens to send some. A wall of text on a phone is the thing being fixed;
 * that fix shouldn't depend on the weather.
 */

/** Splits on sentence ends, leaving decimals and abbreviations alone. */
function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+(?=["'“(]?[A-Z0-9])/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * Paragraphs of at most `per` sentences — two reads as prose, one reads as a
 * list. A long single sentence still gets its own paragraph.
 */
export function paragraphs(text: string, per = 2): string[] {
  const explicit = text
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean);

  // The model paragraphed it itself: respect that, but still break up any
  // block that's really several paragraphs' worth of sentences.
  return explicit.flatMap((block) => {
    const parts = sentences(block);
    if (parts.length <= per) return [block];

    const out: string[] = [];
    for (let index = 0; index < parts.length; index += per) {
      out.push(parts.slice(index, index + per).join(" "));
    }
    return out;
  });
}
