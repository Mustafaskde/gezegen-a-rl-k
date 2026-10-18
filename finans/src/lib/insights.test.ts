import { describe, expect, it } from 'vitest';
import { buildDemoData } from './seed';
import { analyze, expenseBreakdown } from './insights';
import { detectIntent, findingsFor, buildPrompt } from './assistant';

const REF = '2026-10-18';
const data = buildDemoData(REF);
const a = analyze(data, REF);

describe('gider dağılımı', () => {
  it('yüzdeler toplamı 1 eder ve zorunlu/isteğe bağlı ayrılır', () => {
    const b = expenseBreakdown(data, '2026-10-01', REF, '2026-09-01', '2026-09-18');
    expect(b.slices.reduce((s, x) => s + x.pct, 0)).toBeCloseTo(1, 6);
    expect(b.essentialTotal + b.discretionaryTotal).toBeCloseTo(b.total, 2);
    expect(b.slices.find((s) => s.id === 'c-kira')?.essential).toBe(true);
    expect(b.slices.find((s) => s.id === 'c-pazarlama')?.essential).toBe(false);
  });
});

describe('gereksiz harcama tespiti', () => {
  it('mükerrer ödemeyi bulur', () => {
    expect(a.duplicates.map((d) => d.second.description)).toContain('Sosyal medya reklamları');
  });
  it('olağan dışı yüksek harcamayı bulur', () => {
    expect(a.anomalies.map((x) => x.tx.description)).toContain('Espresso makinesi');
  });
  it('düzenli abonelikleri bulur', () => {
    expect(a.subscriptions.map((s) => s.description)).toEqual(expect.arrayContaining(['Tasarım yazılımı aboneliği', 'Bulut depolama ek paketi']));
  });
  it('bütçe aşımını ve ilk sıradaki kritik bulguyu raporlar', () => {
    expect(a.budgets.find((b) => b.id === 'c-pazarlama')!.pct).toBeGreaterThan(1);
    expect(a.insights[0].severity).toBe('critical');
  });
});

describe('asistan', () => {
  it('soruyu doğru konuya eşler', () => {
    expect(detectIntent('Bu ay gereksiz harcamalarım neler?')).toBe('tasarruf');
    expect(detectIntent('Giderlerim nereye gidiyor?')).toBe('dagilim');
    expect(detectIntent('Önümüzdeki 30 günde nakit durumum ne olur?')).toBe('nakit');
    expect(detectIntent('Geciken tahsilatlar kimde?')).toBe('alacak');
  });
  it('modele verilen bulgular hesaplanmış tespitleri içerir', () => {
    const text = findingsFor('tasarruf', a);
    expect(text).toContain('Sosyal medya reklamları');
    expect(text).toContain('Espresso makinesi');
  });
  it('modele giden istem yalnızca özet içerir ve soruyu sona koyar', () => {
    const msgs = buildPrompt('Bu ay gereksiz harcamalarım neler?', [], a, 'Test', REF);
    expect(msgs[0].role).toBe('system');
    expect(msgs[0].content).toContain('HESAPLANMIŞ BULGULAR');
    expect(msgs[0].content).not.toContain('TR12 0001'); // IBAN gibi hesap ayrıntıları gönderilmez
    expect(msgs.at(-1)).toEqual({ role: 'user', content: 'Bu ay gereksiz harcamalarım neler?' });
  });
});
