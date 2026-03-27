import type { OpenClawConfig } from "../../config/config.js";
import { createSubsystemLogger } from "../../logging/subsystem.js";
import { getMemorySearchManager } from "../../memory/search-manager.js";

const log = createSubsystemLogger("semantic-history");

const MAX_SNIPPET_RESULTS = 5;
const MAX_SNIPPET_CHARS = 400;

function truncateSnippet(snippet: string): string {
  if (snippet.length <= MAX_SNIPPET_CHARS) {
    return snippet;
  }
  return snippet.slice(0, MAX_SNIPPET_CHARS) + "…";
}

/**
 * Searches indexed session history for chunks semantically relevant to the
 * current user prompt and returns them as a system-prompt addition.
 *
 * Returns null when memory search is unconfigured, unavailable, or finds
 * nothing relevant — callers should treat null as "no enrichment needed".
 */
export async function buildSemanticHistoryAddition(params: {
  prompt: string;
  sessionKey: string | undefined;
  agentId: string | undefined;
  config: OpenClawConfig;
}): Promise<string | null> {
  const trimmedPrompt = params.prompt.trim();
  if (!trimmedPrompt || !params.agentId) {
    return null;
  }

  let manager: Awaited<ReturnType<typeof getMemorySearchManager>>["manager"];
  try {
    const result = await getMemorySearchManager({
      cfg: params.config,
      agentId: params.agentId,
    });
    manager = result.manager;
    if (!manager) {
      return null;
    }
  } catch (err) {
    log.debug(`semantic-history: manager init failed: ${String(err)}`);
    return null;
  }

  try {
    const results = await manager.search(trimmedPrompt, {
      maxResults: MAX_SNIPPET_RESULTS,
      sessionKey: params.sessionKey,
    });

    if (results.length === 0) {
      return null;
    }

    const lines: string[] = [
      "## Relevant Past Context",
      "The following excerpts from earlier conversations may be relevant:",
      "",
    ];

    for (const r of results) {
      lines.push(truncateSnippet(r.snippet));
      lines.push("");
    }

    return lines.join("\n");
  } catch (err) {
    log.debug(`semantic-history: search failed: ${String(err)}`);
    return null;
  }
}
