import { useState } from 'react';
import { Check, Copy, Cpu, Lock, RefreshCw } from 'lucide-react';
import type { AiEngine } from '../types';
import { useStore } from '../store';
import { useAssistant } from './Assistant';
import { Card, Field, Segmented } from './ui';
import { isLocalUrl } from '../lib/ollama';

const RECOMMENDED = [
  { model: 'qwen2.5:14b', note: '~9 GB · en iyi Türkçe yorum (önerilen)' },
  { model: 'qwen2.5:7b', note: '~4,7 GB · daha hızlı, ekran kartına tamamen sığar' },
];

function CopyLine({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="copy-line">
      <code>{text}</code>
      <button
        type="button"
        className="icon-btn"
        aria-label="Komutu kopyala"
        onClick={() =>
          navigator.clipboard?.writeText(text).then(
            () => {
              setDone(true);
              setTimeout(() => setDone(false), 1500);
            },
            () => {},
          )
        }
      >
        {done ? <Check size={15} /> : <Copy size={15} />}
      </button>
    </div>
  );
}

export default function AiSettings() {
  const { data, dispatch } = useStore();
  const { engine, refresh, ask } = useAssistant();
  const ai = data.settings.ai;
  const [url, setUrl] = useState(ai.ollamaUrl);
  const [urlError, setUrlError] = useState('');
  const [model, setModel] = useState(ai.ollamaModel);
  const installed = engine.kind === 'no-model' ? engine.models : [];

  const save = (patch: Partial<typeof ai>) => dispatch({ type: 'settings/save', settings: { ai: { ...ai, ...patch } } });

  const saveUrl = () => {
    const v = url.trim().replace(/\/+$/, '');
    if (!isLocalUrl(v)) return setUrlError('Gizlilik için yalnızca bu bilgisayardaki adreslere izin verilir (localhost veya 127.0.0.1).');
    setUrlError('');
    if (v !== ai.ollamaUrl) save({ ollamaUrl: v });
  };

  return (
    <Card title="Yapay zekâ asistanı" subtitle="Sorularınız bu bilgisayarda çalışan bir dil modeliyle cevaplanır." className="anchor">
      <span id="bolum-ai" className="anchor-target" />
      <div className="ai-grid">
        <div className="stack-lg">
          <div className="ai-status">
            <span className={`ai-dot ai-${engine.kind}`} />
            <div className="grow">
              <strong>
                {engine.kind === 'ready'
                  ? `Bağlı: ${engine.model}`
                  : engine.kind === 'checking'
                    ? 'Kontrol ediliyor…'
                    : engine.kind === 'rules'
                      ? 'Yalnızca yerleşik analiz kullanılıyor'
                      : engine.kind === 'no-model'
                        ? `Ollama çalışıyor, ${engine.model} yüklü değil`
                        : 'Ollama’ya bağlanılamadı'}
              </strong>
              <span className="muted small">
                {engine.kind === 'ready'
                  ? 'Asistan cevaplarını yerel model yazıyor.'
                  : engine.kind === 'offline'
                    ? engine.error
                    : engine.kind === 'no-model'
                      ? `Yüklü modeller: ${engine.models.join(', ') || 'yok'}`
                      : 'Asistan hesaplanmış bulgularla cevap verir.'}
              </span>
            </div>
            <button className="btn btn-sm" onClick={refresh}>
              <RefreshCw size={14} /> Tekrar dene
            </button>
          </div>

          <div className="form-grid">
            <div className="field-full">
              <Segmented<AiEngine>
                label="Cevap kaynağı"
                value={ai.engine}
                onChange={(engine) => save({ engine })}
                options={[
                  { value: 'ollama', label: 'Yerel model (Ollama)' },
                  { value: 'kural', label: 'Yalnızca yerleşik analiz' },
                ]}
              />
            </div>
            <Field label="Model" hint="Ollama’da yüklü model adı">
              <input
                list="ai-models"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                onBlur={() => model.trim() && model.trim() !== ai.ollamaModel && save({ ollamaModel: model.trim() })}
                disabled={ai.engine !== 'ollama'}
              />
              <datalist id="ai-models">
                {[...new Set([...RECOMMENDED.map((r) => r.model), ...installed])].map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </Field>
            <Field label="Ollama adresi" hint="Varsayılan: http://localhost:11434">
              <input value={url} onChange={(e) => setUrl(e.target.value)} onBlur={saveUrl} disabled={ai.engine !== 'ollama'} />
            </Field>
            {urlError && <p className="form-error field-full">{urlError}</p>}
            <div className="field-full model-options">
              {RECOMMENDED.map((r) => (
                <button
                  key={r.model}
                  type="button"
                  className={`model-option ${ai.ollamaModel === r.model ? 'active' : ''}`}
                  onClick={() => {
                    setModel(r.model);
                    save({ ollamaModel: r.model, engine: 'ollama' });
                  }}
                >
                  <Cpu size={15} />
                  <span>
                    <strong>{r.model}</strong>
                    <span className="muted small">{r.note}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="row-gap">
            <button className="btn btn-primary btn-sm" onClick={() => ask('Bu ayın genel durumunu özetler misin?')}>
              Asistanı dene
            </button>
          </div>
          <p className="privacy-note">
            <Lock size={14} /> İstekler yalnızca bu bilgisayardaki Ollama’ya gider; internete veya bir bulut hizmetine veri gönderilmez. Model, finansal verilerinizin kendisini değil, uygulamanın hesapladığı özetleri görür.
          </p>
        </div>

        <ol className="setup-steps">
          <li>
            <strong>Ollama’yı kurun</strong>
            <span className="muted">
              <a href="https://ollama.com/download" target="_blank" rel="noreferrer">
                ollama.com/download
              </a>{' '}
              adresinden Windows sürümünü indirip kurun. Kurulumdan sonra arka planda kendiliğinden çalışır.
            </span>
          </li>
          <li>
            <strong>Modeli indirin (bir kez)</strong>
            <span className="muted">Komut İstemi’ni (cmd) açıp yazın. İndirme yaklaşık 9 GB’tır.</span>
            <CopyLine text="ollama pull qwen2.5:14b" />
          </li>
          <li>
            <strong>Çalıştığını kontrol edin</strong>
            <CopyLine text={'ollama run qwen2.5:14b "Merhaba"'} />
            <span className="muted">Cevap geliyorsa bu sayfada “Tekrar dene”ye basın.</span>
          </li>
          <li>
            <strong>RTX 5060 için not</strong>
            <span className="muted">
              Güncel NVIDIA sürücüsü ve güncel Ollama kullanın. 14B modelin bir kısmı ekran kartına (8 GB), kalanı RAM’e yüklenir. Cevaplar yavaş gelirse <code>ollama pull qwen2.5:7b</code> ile 7B modele geçin.
            </span>
          </li>
        </ol>
      </div>
    </Card>
  );
}
