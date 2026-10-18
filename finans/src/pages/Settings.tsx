import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Download, Trash2, Upload } from 'lucide-react';
import type { CategoryKind, Currency } from '../types';
import { useStore, validateData } from '../store';
import { askConfirm, Card, Field, PageHeader, Segmented } from '../components/ui';
import { buildDemoData, emptyData } from '../lib/seed';
import { today } from '../lib/date';
import { parseAmount, uid } from '../lib/format';
import { downloadFile } from '../lib/csv';
import AiSettings from '../components/AiSettings';

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
      if (await askConfirm('Mevcut verilerin yerine yedekteki veriler yüklenecek. Devam edilsin mi?', { confirmLabel: 'Yükle' })) {
        dispatch({ type: 'data/replace', data: parsed });
        flash('Yedek yüklendi');
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Dosya okunamadı');
    }
  };

  // #/ayarlar?bolum=ai gibi bağlantılarla ilgili bölüme kaydır
  useEffect(() => {
    const section = new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('bolum');
    if (section) document.getElementById(`bolum-${section}`)?.scrollIntoView({ block: 'start' });
  }, []);

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
            <button className="btn export-only" onClick={exportJSON}>
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
              onClick={async () => {
                if (await askConfirm('Mevcut verilerin yerine demo veriler yüklenecek. Devam edilsin mi?', { confirmLabel: 'Demo verileri yükle' })) {
                  dispatch({ type: 'data/replace', data: buildDemoData(today()) });
                  flash('Demo veriler yüklendi');
                }
              }}
            >
              Demo verileri yükle
            </button>
            <button
              className="btn btn-danger-ghost"
              onClick={async () => {
                if (await askConfirm('Tüm hesaplar, işlemler, cariler ve vadeli kayıtlar silinecek. Bu işlem geri alınamaz. Emin misiniz?', { danger: true, confirmLabel: 'Tümünü sil' })) {
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

      <AiSettings />

      <Card title="Kategoriler ve bütçeler" subtitle="Zorunlu olmayan giderler asistan tarafından tasarruf fırsatı olarak değerlendirilir." className="anchor">
        <span id="bolum-kategoriler" className="anchor-target" />
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
        <h4 className="list-title">Gider kategorileri</h4>
        <div className="table-wrap">
          <table className="table cat-table">
            <thead>
              <tr>
                <th>Kategori</th>
                <th>Tür</th>
                <th className="right">Aylık bütçe (TL)</th>
                <th className="right hide-sm">Kayıt</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.categories
                .filter((c) => c.kind === 'gider')
                .map((c) => (
                  <tr key={c.id}>
                    <td>
                      <input
                        defaultValue={c.name}
                        aria-label="Kategori adı"
                        onBlur={(e) => e.target.value.trim() && e.target.value !== c.name && dispatch({ type: 'category/save', category: { ...c, name: e.target.value.trim() } })}
                      />
                    </td>
                    <td>
                      <Segmented
                        label={`${c.name} türü`}
                        value={c.essential ? 'zorunlu' : 'istege'}
                        onChange={(v) => dispatch({ type: 'category/save', category: { ...c, essential: v === 'zorunlu' } })}
                        options={[
                          { value: 'zorunlu', label: 'Zorunlu' },
                          { value: 'istege', label: 'İsteğe bağlı' },
                        ]}
                      />
                    </td>
                    <td className="right">
                      <input
                        className="budget-input"
                        inputMode="decimal"
                        placeholder="Yok"
                        defaultValue={c.budget ? String(c.budget) : ''}
                        aria-label={`${c.name} aylık bütçe`}
                        onBlur={(e) => {
                          const v = e.target.value.trim() ? parseAmount(e.target.value) : 0;
                          if (isNaN(v) || v < 0) return;
                          if ((c.budget ?? 0) !== v) dispatch({ type: 'category/save', category: { ...c, budget: v || undefined } });
                        }}
                      />
                    </td>
                    <td className="right muted hide-sm">{usage(c.id)}</td>
                    <td className="right">
                      <button
                        className="icon-btn"
                        aria-label={`${c.name} sil`}
                        onClick={async () => (await askConfirm(`"${c.name}" silinsin mi? İlişkili kayıtlar kategorisiz kalır.`, { danger: true, confirmLabel: 'Sil' })) && dispatch({ type: 'category/delete', id: c.id })}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <h4 className="list-title spaced">Gelir kategorileri</h4>
        <ul className="cat-list">
          {data.categories
            .filter((c) => c.kind === 'gelir')
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
                  onClick={async () => (await askConfirm(`"${c.name}" silinsin mi? İlişkili kayıtlar kategorisiz kalır.`, { danger: true, confirmLabel: 'Sil' })) && dispatch({ type: 'category/delete', id: c.id })}
                >
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
        </ul>
      </Card>
    </>
  );
}
