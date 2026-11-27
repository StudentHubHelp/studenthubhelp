export type TavilyEvidence = {
  sources: Array<{
    title: string;
    url: string;
    snippet: string;
    content: string;
    score: number | null;
    published_date: string;
    extraction_status: string;
  }>;
  status: string;
  requested: number;
};

/** One Basic Search call per DCE task. No advanced search, raw extraction or crawling. */
export async function fetchTavilyEvidence(
  query: string,
  apiKey: string,
): Promise<TavilyEvidence> {
  if (!apiKey) return { sources: [], status: "tavily_secret_unavailable", requested: 0 };
  try {
    // Verify the account is on a free plan with pay-as-you-go disabled before any search.
    const usageResponse = await fetch("https://api.tavily.com/usage", {
      method: "GET",
      headers: { Authorization: "Bearer " + apiKey },
      signal: AbortSignal.timeout(8000),
    });
    if (!usageResponse.ok) {
      return { sources: [], status: usageResponse.status === 401 || usageResponse.status === 403 ? "tavily_invalid_key" : "tavily_usage_unavailable", requested: 1 };
    }
    const usage = await usageResponse.json().catch(() => null);
    const plan = String(usage?.account?.current_plan || "").toLowerCase();
    const paygoLimit = Number(usage?.account?.paygo_limit || 0);
    if (!["researcher", "free"].includes(plan) || paygoLimit !== 0) {
      return { sources: [], status: "tavily_paid_plan_blocked", requested: 1 };
    }
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey },
      body: JSON.stringify({
        query: query.slice(0, 500),
        search_depth: "basic",
        max_results: 5,
        include_answer: false,
        include_raw_content: false,
      }),
      signal: AbortSignal.timeout(14000),
    });
    if (!response.ok) return { sources: [], status: "tavily_http_" + response.status, requested: 2 };
    const data = await response.json().catch(() => null);
    const results = Array.isArray(data?.results) ? data.results : [];
    const sources = results.slice(0, 5).flatMap((item: any) => {
      try {
        const parsed = new URL(String(item?.url || ""));
        if (parsed.protocol !== "https:" || parsed.username || parsed.password ||
            parsed.hostname === "localhost" || parsed.hostname.endsWith(".local") ||
            /^\d{1,3}(?:\.\d{1,3}){3}$/.test(parsed.hostname)) return [];
        const title = String(item?.title || "").trim().slice(0, 240);
        const content = String(item?.content || "").trim().slice(0, 1800);
        if (!title || !content) return [];
        return [{
          title,
          url: parsed.toString(),
          snippet: content.slice(0, 700),
          content,
          score: Number.isFinite(Number(item?.score)) ? Number(item.score) : null,
          published_date: String(item?.published_date || "").slice(0, 40),
          extraction_status: "tavily_basic_search_snippet",
        }];
      } catch { return []; }
    });
    return { sources, status: sources.length ? "tavily_basic_search" : "tavily_no_valid_results", requested: 2 };
  } catch {
    return { sources: [], status: "tavily_timeout_or_network_error", requested: 1 };
  }
}
