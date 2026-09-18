import { GoogleGenAI } from "@google/genai";
import type { Researched } from "@/lib/wine-research";

/**
 * The same job as the search stage in wine-research, asked of Google instead.
 *
 * Looking a bottle up is two steps, and always has been: find out what the web
 * says and write it up, then file that write-up into fields. Only the first
 * step is here. The filing stays where it is, on the same model and the same
 * schema, so nothing downstream can tell which search produced the prose — the
 * facts panel, the map, the grapes index and the serving note all carry on
 * unchanged.
 *
 * That split is also what makes this possible at all. Gemini will not combine
 * Google Search grounding with a forced JSON schema in one call, and the usual
 * way round that is an awkward two-pass affair. Here there was already a
 * second pass to hand.
 *
 * Why try it: a natural rosé from the Gulf of Saint-Tropez came back thin from
 * the existing lookup and richly from an ordinary Google search — the
 * producer, the biodynamic farming, the flavour profile, and a Vivino page the
 * other search never turned up. Small growers and natural wine are exactly
 * where a general web index is thinner than Google's, so this is worth
 * measuring rather than arguing about.
 */

const MODEL = process.env.GEMINI_SEARCH_MODEL ?? "gemini-3-pro-preview";
const TIMEOUT_MS = 90_000;

/** As many pages as are worth keeping a link to. */
const MOST_SOURCES = 12;

type Research = { text: string; sources: { title: string; url: string }[] };

/**
 * What Google says about this bottle, written up.
 *
 * Returns the same shape the Anthropic search stage does, including its
 * failure shape, so the caller picks one or the other and changes nothing
 * else.
 */
export async function searchWithGemini(
  bottle: string,
  query: string,
  system: string,
): Promise<Research | Researched> {
  if (!process.env.GEMINI_API_KEY) {
    return {
      status: "unavailable",
      message: "GEMINI_API_KEY isn't set, so this wine can't be looked up with Google.",
    };
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const startedAt = Date.now();

  let response;
  try {
    response = await ai.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: "user",
          parts: [
            {
              text:
                `Find out what's known about this exact bottle. If the results are thin, say so.\n\n` +
                `Bottle as it was logged:\n${bottle}\n\nA search to start from: ${query}`,
            },
          ],
        },
      ],
      config: {
        systemInstruction: system,
        // Grounding, which is the whole point of coming here.
        tools: [{ googleSearch: {} }],
        abortSignal: AbortSignal.timeout(TIMEOUT_MS),
      },
    });
  } catch (error) {
    const detail = (error instanceof Error ? error.message : String(error))
      .replace(/AIza[0-9A-Za-z_-]{10,}/g, "AIza…")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 400);
    console.error("wine-search-gemini: call failed:", detail);
    return { status: "unavailable", message: `Couldn't search for this wine. Google said: ${detail}` };
  }

  const text = (response.text ?? "").trim();

  /*
   * The pages it actually read, for the reference links under the write-up.
   *
   * Google hands these back as grounding chunks rather than as part of the
   * prose, and the URLs in them are redirect stubs on Google's own domain
   * rather than the publisher's. They are kept as they come: they resolve, and
   * rewriting a citation to a address the model never actually read would be a
   * worse kind of tidy.
   */
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const seen = new Set<string>();
  const sources: { title: string; url: string }[] = [];
  for (const chunk of chunks) {
    const url = chunk.web?.uri;
    if (!url || seen.has(url)) continue;
    seen.add(url);
    sources.push({ title: chunk.web?.title?.trim() || url, url });
    if (sources.length >= MOST_SOURCES) break;
  }

  console.log(
    `wine-search-gemini: ${Date.now() - startedAt}ms, ` +
      `${text.length} chars, ${sources.length} pages, ${MODEL}`,
  );

  if (!text) {
    return { status: "unavailable", message: "Google came back with nothing about this bottle." };
  }

  return { text, sources };
}
