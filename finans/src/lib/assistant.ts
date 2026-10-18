// Asistan için model bağlamı: soruyu bir konuya eşler ve o konudaki hesaplanmış bulguları
// metne döker. Kullanıcıya gösterilen cevabı her zaman yerel model yazar; buradaki metinler
// yalnızca modele verilen veridir.
import type { Analysis } from './insights';
import { fmtDate, fmtShortDate, money } from './format';

export type Intent = 'tasarruf' | 'dagilim' | 'nakit' | 'alacak' | 'odemeler' | 'karsilastirma' | 'butce' | 'ozet';

const KEYWORDS: [Intent, RegExp][] = [
  ['tasarruf', /gereksiz|tasarruf|israf|kıs|azalt|fazla harca|boşa|lüks|kes(e|i)bil|neyi kes/],
  ['butce', /bütçe|limit|aş(ıl|tı|ma)/],
  ['dagilim', /nereye|dağılım|yüzde|oran|kategori|en çok|neye gid|harcamalarım ne/],
  ['alacak', /alacak|tahsil|gecik|borçlu|müşteri.*öde|kim.*borç/],
  ['odemeler', /ödeme|yaklaşan|vade|fatura.*ne zaman|ne ödeyece/],
  ['nakit', /nakit|bakiye|para.*yet|yeter|tahmin|akış|kasa|banka/],
  ['karsilastirma', /geçen ay|karşılaştır|değiş|fark|arttı|azaldı|önceki/],
  ['ozet', /özet|durum|genel|nasıl gidiyor|rapor/],
];

export function detectIntent(question: string): Intent {
  const q = question.toLocaleLowerCase('tr');
  for (const [intent, re] of KEYWORDS) if (re.test(q)) return intent;
  return 'ozet';
}

export const SUGGESTED_QUESTIONS = [
  'Bu ay gereksiz harcamalarım neler?',
  'Giderlerim nereye gidiyor?',
  'Önümüzdeki 30 günde nakit durumum ne olur?',
  'Geciken tahsilatlar kimde?',
  'Geçen aya göre ne değişti?',
  'Bütçemi aşan kategoriler var mı?',
];

const pct = (v: number) => `%${(Math.abs(v) * 100).toFixed(1).replace('.', ',').replace(',0', '')}`;
const signedPct = (v: number) => (isFinite(v) ? `${v >= 0 ? '+' : '−'}${pct(v)}` : 'yeni');

function savings(a: Analysis): string {
  const lines: string[] = [];
  const disc = a.breakdown.slices.filter((s) => !s.essential);
  lines.push(
    `Bu ay ${money(a.expense)} giderin **${money(a.breakdown.discretionaryTotal)}** kadarı isteğe bağlı kategorilerde (${pct(a.expense ? a.breakdown.discretionaryTotal / a.expense : 0)}).`,
  );
  if (a.duplicates.length) {
    lines.push('', '**Mükerrer olabilecek ödemeler**');
    for (const d of a.duplicates) lines.push(`- ${d.second.description}: ${money(d.amount)}, ${fmtShortDate(d.first.date)} ve ${fmtShortDate(d.second.date)} tarihlerinde iki kez. İade talep edilebilir.`);
  }
  if (a.anomalies.length) {
    lines.push('', '**Olağan dışı yüksek harcamalar**');
    for (const an of a.anomalies.slice(0, 4)) lines.push(`- ${an.tx.description} (${an.category}): ${money(an.amount)}. Bu kategoride tipik tutar ${money(an.typical)}.`);
  }
  const rising = a.trends.filter((t) => !t.essential && t.current > t.average * 1.15 && t.current - t.average > 1000);
  if (rising.length) {
    lines.push('', '**Ortalamanın üzerine çıkan isteğe bağlı kategoriler**');
    for (const t of rising) lines.push(`- ${t.name}: ${money(t.current)} (son 3 ay aynı dönem ortalaması ${money(t.average)}, ${signedPct(t.change)})`);
  }
  if (a.subscriptions.length) {
    lines.push('', '**Gözden geçirilecek düzenli ödemeler**');
    for (const s of a.subscriptions) lines.push(`- ${s.description}: ayda ${money(s.monthly)} (${s.months} aydır)`);
  }
  if (!a.duplicates.length && !a.anomalies.length && !rising.length && disc.length) {
    lines.push('', 'Belirgin bir aşırı harcama görünmüyor. İsteğe bağlı kategoriler:');
    for (const s of disc.slice(0, 4)) lines.push(`- ${s.name}: ${money(s.total)}`);
  }
  if (a.savingsPotential > 0) lines.push('', `İsteğe bağlı kategorileri son 3 ay ortalamasına çekerseniz bu ay yaklaşık **${money(a.savingsPotential)}** tasarruf edilebilir.`);
  return lines.join('\n');
}

function breakdown(a: Analysis): string {
  const b = a.breakdown;
  if (!b.total) return 'Bu ay henüz gider kaydı yok.';
  const lines = [`Bu ay toplam gider **${money(b.total)}**. Kategorilere göre dağılım:`, ''];
  for (const s of b.slices.slice(0, 8)) lines.push(`- ${s.name}: **${pct(s.pct)}** · ${money(s.total)}${isFinite(s.change) ? ` (geçen aya göre ${signedPct(s.change)})` : ''}`);
  lines.push('', `Zorunlu giderler ${pct(b.essentialTotal / b.total)}, isteğe bağlı giderler ${pct(b.discretionaryTotal / b.total)}.`);
  return lines.join('\n');
}

function cash(a: Analysis): string {
  const lines = [
    `Bugünkü toplam nakit **${money(a.cash)}**.`,
    `Önümüzdeki 30 günde ${money(a.upcomingIn30)} tahsilat ve ${money(a.upcomingOut30)} ödeme planlı; gecikmişler dahil 30 gün sonra tahmini bakiye **${money(a.forecast30)}**.`,
    `Bu dönemdeki en düşük seviye ${fmtDate(a.minDate)} tarihinde ${money(a.minBalance)}.`,
  ];
  if (isFinite(a.runwayMonths)) lines.push(`Ortalama aylık gider ${money(a.avgMonthlyExpense)}; mevcut nakit yaklaşık **${a.runwayMonths.toFixed(1).replace('.', ',')} ay** yeter.`);
  if (a.minBalance < 0) lines.push('', 'Nakit eksiye düşüyor: gecikmiş tahsilatları hızlandırmak veya büyük ödemeleri ertelemek gerekebilir.');
  return lines.join('\n');
}

function receivables(a: Analysis): string {
  if (!a.overdueReceivables.length) return 'Vadesi geçmiş tahsilat yok.';
  const lines = [`Vadesi geçmiş toplam alacak **${money(a.overdueReceivableTotal)}**:`, ''];
  for (const r of a.overdueReceivables) lines.push(`- ${r.name}: ${money(r.amount)}, ${r.days} gün gecikmiş`);
  if (isFinite(a.avgCollectionDays)) lines.push('', `Son 6 ayda ortalama tahsilat süresi ${a.avgCollectionDays} gün.`);
  return lines.join('\n');
}

function payments(a: Analysis): string {
  if (!a.upcomingPayments.length) return 'Önümüzdeki 30 günde planlı ödeme yok.';
  const lines = [`Önümüzdeki 30 günde toplam **${money(a.upcomingOut30)}** ödeme var:`, ''];
  for (const p of a.upcomingPayments.slice(0, 10)) lines.push(`- ${fmtShortDate(p.date)}: ${p.title} · ${money(p.amount)}`);
  if (a.overduePayableTotal) lines.push('', `Ayrıca ${money(a.overduePayableTotal)} tutarında vadesi geçmiş ödeme bulunuyor.`);
  return lines.join('\n');
}

function comparison(a: Analysis): string {
  const ch = (c: number, p: number) => (p ? signedPct((c - p) / p) : 'yeni');
  const lines = [
    `Bu ay (${a.period.label}) ile ${a.period.prevLabel} karşılaştırması:`,
    '',
    `- Gelir: ${money(a.income)} (${ch(a.income, a.prevIncome)})`,
    `- Gider: ${money(a.expense)} (${ch(a.expense, a.prevExpense)})`,
    `- Net: ${money(a.net, 'TRY', { sign: true })} (önceki ${money(a.prevIncome - a.prevExpense, 'TRY', { sign: true })})`,
  ];
  const movers = a.breakdown.slices.filter((s) => isFinite(s.change) && Math.abs(s.total - s.prevTotal) > 1000).sort((x, y) => Math.abs(y.total - y.prevTotal) - Math.abs(x.total - x.prevTotal));
  if (movers.length) {
    lines.push('', '**En çok değişen gider kalemleri**');
    for (const s of movers.slice(0, 4)) lines.push(`- ${s.name}: ${money(s.prevTotal)} → ${money(s.total)} (${signedPct(s.change)})`);
  }
  return lines.join('\n');
}

function budget(a: Analysis): string {
  if (!a.budgets.length) return 'Henüz bütçe tanımlı kategori yok. Ayarlar → Kategoriler bölümünden aylık bütçe girebilirsiniz.';
  const lines = ['Bu ayki bütçe durumu:', ''];
  for (const b of a.budgets) {
    const state = b.pct >= 1 ? 'aşıldı' : b.projected > b.budget ? 'ay sonunda aşılacak' : 'yolunda';
    lines.push(`- ${b.name}: ${money(b.spent)} / ${money(b.budget)} (${pct(b.pct)}), **${state}**`);
  }
  return lines.join('\n');
}

function summary(a: Analysis): string {
  const lines = [
    `Bu ay gelir ${money(a.income)}, gider ${money(a.expense)}, net **${money(a.net, 'TRY', { sign: true })}**. Toplam nakit ${money(a.cash)}.`,
  ];
  const top = a.insights.filter((i) => i.severity !== 'good').slice(0, 4);
  if (top.length) {
    lines.push('', '**Dikkat edilmesi gerekenler**');
    for (const i of top) lines.push(`- ${i.title}: ${i.detail}`);
  }
  return lines.join('\n');
}

export function findingsFor(intent: Intent, a: Analysis): string {
  switch (intent) {
    case 'tasarruf':
      return savings(a);
    case 'dagilim':
      return breakdown(a);
    case 'nakit':
      return cash(a);
    case 'alacak':
      return receivables(a);
    case 'odemeler':
      return payments(a);
    case 'karsilastirma':
      return comparison(a);
    case 'butce':
      return budget(a);
    default:
      return summary(a);
  }
}

/** Modele verilecek genel tablo: kısa tutulur ki küçük modellerin bağlamı taşmasın. */
export function factSheet(a: Analysis, company: string, ref: string): string {
  return [
    `Şirket: ${company} | Bugün: ${fmtDate(ref)} | Tutarlar TL.`,
    `Bu ay (1'inden bugüne): gelir ${money(a.income)}, gider ${money(a.expense)}, net ${money(a.net)}. Geçen ayın aynı dönemi: gelir ${money(a.prevIncome)}, gider ${money(a.prevExpense)}.`,
    `Toplam nakit ${money(a.cash)}; 30 gün sonra tahmini ${money(a.forecast30)}; aylık ortalama gider ${money(a.avgMonthlyExpense)}.`,
    `Gider dağılımı: ${a.breakdown.slices
      .slice(0, 8)
      .map((s) => `${s.name} ${pct(s.pct)} (${money(s.total)}, ${s.essential ? 'zorunlu' : 'isteğe bağlı'})`)
      .join('; ')}.`,
    `Vadesi geçmiş alacak ${money(a.overdueReceivableTotal)}; 30 gün içinde planlı tahsilat ${money(a.upcomingIn30)}, ödeme ${money(a.upcomingOut30)}.`,
  ].join('\n');
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function buildPrompt(question: string, history: ChatMessage[], a: Analysis, company: string, ref: string) {
  const intent = detectIntent(question);
  const system = [
    'Sen bir şirketin yerel finans asistanısın. Her zaman Türkçe, kısa ve net cevap ver.',
    'Yalnızca aşağıdaki VERİ ve HESAPLANMIŞ BULGULAR bölümlerindeki bilgilere dayan. Bu bölümlerde olmayan hiçbir sayı, kişi veya işlem uydurma; hesap yapman gerekiyorsa verilen hazır sayıları kullan.',
    'Önce doğrudan cevabı ver, sonra en fazla 3 somut ve uygulanabilir öneri yaz. Madde işaretleri için "- " kullan, önemli tutarları **kalın** yaz.',
    'Bilgi yoksa bunu açıkça söyle.',
    'Kullanıcı bir kayıt (hesap, gelir/gider, planlı ödeme veya cari) eklemek istiyor ama tutar, tarih, hesap ya da ad gibi bilgiler eksikse kaydı ekleyemediğini söyle ve eksik bilgiyi sor. Kayıt eklendiğini asla iddia etme.',
    '',
    'VERİ',
    factSheet(a, company, ref),
    '',
    'HESAPLANMIŞ BULGULAR (soruyla ilgili)',
    findingsFor(intent, a),
  ].join('\n');
  return [{ role: 'system' as const, content: system }, ...history.slice(-6), { role: 'user' as const, content: question }];
}
