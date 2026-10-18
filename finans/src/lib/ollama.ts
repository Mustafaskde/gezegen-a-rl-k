// Bilgisayarda çalışan Ollama sunucusuyla konuşur. İstekler yalnızca ayarlarda
// yazılı yerel adrese gider (varsayılan http://localhost:11434).

export interface OllamaStatus {
  ok: boolean;
  models: string[];
  error?: string;
}

const clean = (url: string) => url.replace(/\/+$/, '');

export function isLocalUrl(url: string): boolean {
  try {
    const h = new URL(url).hostname;
    return h === 'localhost' || h === '127.0.0.1' || h === '::1' || h === '[::1]';
  } catch {
    return false;
  }
}

export async function ollamaStatus(url: string): Promise<OllamaStatus> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch(`${clean(url)}/api/tags`, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return { ok: false, models: [], error: `Ollama ${res.status} hatası verdi.` };
    const body = (await res.json()) as { models?: { name: string }[] };
    return { ok: true, models: (body.models ?? []).map((m) => m.name).sort() };
  } catch {
    return { ok: false, models: [], error: 'Ollama çalışmıyor ya da bu adrese ulaşılamıyor.' };
  }
}

/** Model adı yüklü modellerle eşleşiyor mu ("qwen2.5:14b" ~ "qwen2.5:14b-instruct"). */
export function hasModel(models: string[], wanted: string): boolean {
  const w = wanted.includes(':') ? wanted : `${wanted}:latest`;
  return models.some((m) => m === w || m.startsWith(w));
}

export async function streamChat(
  url: string,
  model: string,
  messages: { role: string; content: string }[],
  onToken: (t: string) => void,
  signal: AbortSignal,
): Promise<void> {
  const res = await fetch(`${clean(url)}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, stream: true, keep_alive: '15m', options: { temperature: 0.3, num_ctx: 4096 } }),
    signal,
  });
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '');
    throw new Error(res.status === 404 ? `"${model}" modeli yüklü değil. Komut satırında: ollama pull ${model}` : `Ollama hatası (${res.status}) ${text.slice(0, 120)}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      const msg = JSON.parse(line) as { message?: { content?: string }; error?: string };
      if (msg.error) throw new Error(msg.error);
      if (msg.message?.content) onToken(msg.message.content);
    }
  }
}

/** Yapılandırılmış çıktı: model cevabı verilen JSON şemasına uymak zorundadır. */
export async function chatJSON(url: string, model: string, messages: { role: string; content: string }[], schema: object, signal?: AbortSignal): Promise<unknown> {
  const res = await fetch(`${clean(url)}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, stream: false, format: schema, keep_alive: '15m', options: { temperature: 0 } }),
    signal,
  });
  if (!res.ok) throw new Error(`Ollama hatası (${res.status})`);
  const body = (await res.json()) as { message?: { content?: string } };
  return JSON.parse(body.message?.content ?? 'null');
}
