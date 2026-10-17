import { useRef, useState, type FormEvent } from 'react';
import { Download, Trash2, Upload } from 'lucide-react';
import type { CategoryKind, Currency } from '../types';
import { useStore, validateData } from '../store';
import { Card, Field, PageHeader, Segmented } from '../components/ui';
import { buildDemoData, emptyData } from '../lib/seed';
import { today } from '../lib/date';
import { parseAmount, uid } from '../lib/format';
import { downloadFile } from '../lib/csv';

export default function SettingsPage() {
  const { data, dispatch } = useStore();
  const [company, setCompany] = useState(data.settings.companyName);
  const [usd, setUsd] = useState(String(data.settings.rates.USD).replace('.', ','));
  const [eur, setEur] = useState(String(data.settings.rates.EUR).replace('.', ','));
  const [saved, setSaved] = useState('');
  const [catName, setCatName] = useState('');
  const [catKind, setCatKind] = useState<CategoryKind>('gider');
  const [importError, setImportError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const flash = (m: string) => {
    setSaved(m);
    setTimeout(() => setSaved(''), 2000);
  };

  const saveGeneral = (e: FormEvent) => {
    e.preventDefault();
    const rates: Record<Currency, number> = { TRY: 1, USD: parseAmount(usd), EUR: parseAmount(eur) };
    if (!(rates.USD > 0) || !(rates.EUR > 0)) return flash('Kur değerleri geçersiz');
    dispatch({ type: 'settings/save', settings: { companyName: company.trim() || 'Şirketim', rates } });
    flash('Kaydedildi');
  };

  const addCategory = (e: FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    dispatch({ type: 'category/save', category: { id: uid(), name: catName.trim(), kind: catKind } });
    setCatName('');
  };

  const exportJSON = () => downloadFile(`finans_yedek_${today()}.json`, JSON.stringify(data, null, 2), 'application/json');

  const importJSON = async (file: File) => {
    setImportError('');
    try {
      const parsed = validateData(JSON.parse(await file.text()));
      if (window.confirm('Mevcut verilerin yerine yedekteki veriler yüklenecek. Devam edilsin mi?')) {
        dispatch({ type: 'data/replace', data: parsed });
        flash('Yedek yüklendi');
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Dosya okunamadı');
    }
  };

  const usage = (id: string) => data.transactions.filter((t) => t.categoryId === id).length + data.scheduled.filter((s) => s.categoryId === id).length;

  return (
    <>
      <PageHeader title="Ayarlar" subtitle="Şirket bilgileri, döviz kurları, kategoriler ve veri yönetimi" />
      {saved && (
        <div className="toast" role="status">
          {saved}
        </div>
      )}
      <div className="grid-1-1">
        <Card title="Genel">
          <form className="form-grid" onSubmit={saveGeneral}>
            <Field label="Şirket adı" full>
              <input value={company} onChange={(e) => setCompany(e.target.value)} />
            </Field>
            <Field label="1 USD (TL)" hint="Döviz hesaplarının TL karşılığı için">
              <input inputMode="decimal" value={usd} onChange={(e) => setUsd(e.target.value)} />
            </Field>
            <Field label="1 EUR (TL)">
              <input inputMode="decimal" value={eur} onChange={(e) => setEur(e.target.value)} />
            </Field>
            <div className="field-full">
              <button className="btn btn-primary" type="submit">
                Kaydet
              </button>
            </div>
          </form>
          <div className="settings-row">
            <span>Tema</span>
            <Segmented
              label="Tema"
              value={data.settings.theme}
              onChange={(theme) => dispatch({ type: 'settings/save', settings: { theme } })}
              options={[
                { value: 'system', label: 'Sistem' },
                { value: 'light', label: 'Açık' },
                { value: 'dark', label: 'Koyu' },
              ]}
            />
          </div>
        </Card>

        <Card title="Veri yönetimi" subtitle="Veriler yalnızca bu tarayıcıda saklanır. Düzenli yedek almanız önerilir.">
          <div className="stack">
            <button className="btn" onClick={exportJSON}>
              <Download size={16} /> Yedeği indir (JSON)
            </button>
            <button className="btn" onClick={() => fileRef.current?.click()}>
              <Upload size={16} /> Yedekten geri yükle
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importJSON(f);
                e.target.value = '';
              }}
            />
            {importError && <p className="form-error">{importError}</p>}
            <hr />
            <button
              className="btn"
              onClick={() => {
                if (window.confirm('Mevcut verilerin yerine demo veriler yüklenecek. Devam edilsin mi?')) {
                  dispatch({ type: 'data/replace', data: buildDemoData(today()) });
                  flash('Demo veriler yüklendi');
                }
              }}
            >
              Demo verileri yükle
            </button>
            <button
              className="btn btn-danger-ghost"
              onClick={() => {
                if (window.confirm('Tüm hesaplar, işlemler, cariler ve vadeli kayıtlar silinecek. Bu işlem geri alınamaz. Emin misiniz?')) {
                  dispatch({ type: 'data/replace', data: { ...emptyData(), settings: data.settings } });
                  flash('Tüm veriler silindi');
                }
              }}
            >
              <Trash2 size={16} /> Tüm verileri sil
            </button>
          </div>
        </Card>
      </div>

      <Card title="Kategoriler">
        <form className="filters" onSubmit={addCategory}>
          <input placeholder="Yeni kategori adı" value={catName} onChange={(e) => setCatName(e.target.value)} aria-label="Kategori adı" />
          <Segmented
            label="Kategori türü"
            value={catKind}
            onChange={setCatKind}
            options={[
              { value: 'gelir', label: 'Gelir' },
              { value: 'gider', label: 'Gider' },
            ]}
          />
          <button className="btn btn-primary" type="submit">
            Ekle
          </button>
        </form>
        <div className="grid-1-1 tight">
          {(['gelir', 'gider'] as const).map((k) => (
            <div key={k}>
              <h4 className="list-title">{k === 'gelir' ? 'Gelir kategorileri' : 'Gider kategorileri'}</h4>
              <ul className="cat-list">
                {data.categories
                  .filter((c) => c.kind === k)
                  .map((c) => (
                    <li key={c.id}>
                      <input
                        defaultValue={c.name}
                        aria-label="Kategori adı"
                        onBlur={(e) => e.target.value.trim() && e.target.value !== c.name && dispatch({ type: 'category/save', category: { ...c, name: e.target.value.trim() } })}
                      />
                      <span className="muted small">{usage(c.id)} kayıt</span>
                      <button
                        className="icon-btn"
                        aria-label={`${c.name} sil`}
                        onClick={() => window.confirm(`"${c.name}" silinsin mi? İlişkili kayıtlar kategorisiz kalır.`) && dispatch({ type: 'category/delete', id: c.id })}
                      >
                        <Trash2 size={15} />
                      </button>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
