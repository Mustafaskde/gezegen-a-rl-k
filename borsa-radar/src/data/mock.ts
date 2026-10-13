// DEMO VERİSİ: Şirketler ve duyurular tamamen hayalidir.
// Gerçek veri kaynağı (KAP / SEC EDGAR + AI analizi) bağlandığında bu dosya kaldırılacak.
import type { Company, Disclosure, MarketDigest } from './types';

export const companies: Company[] = [
  { id: 'c_mvsvn', market: 'BIST', exchange: 'BIST', ticker: 'MVSVN', name: 'Mavi Savunma Sistemleri', sector: 'defense', currency: 'TRY', annualRevenue: 62e9, fiscalYear: 2025 },
  { id: 'c_ankhv', market: 'BIST', exchange: 'BIST', ticker: 'ANKHV', name: 'Ankara Havacılık', sector: 'aviation', currency: 'TRY', annualRevenue: 410e9, fiscalYear: 2025 },
  { id: 'c_kzyen', market: 'BIST', exchange: 'BIST', ticker: 'KZYEN', name: 'Kuzey Enerji', sector: 'energy', currency: 'TRY', annualRevenue: 48e9, fiscalYear: 2025 },
  { id: 'c_trsgd', market: 'BIST', exchange: 'BIST', ticker: 'TRSGD', name: 'Toros Gıda', sector: 'food', currency: 'TRY', annualRevenue: 21e9, fiscalYear: 2025 },
  { id: 'c_egbnk', market: 'BIST', exchange: 'BIST', ticker: 'EGBNK', name: 'Ege Yatırım Bankası', sector: 'banking', currency: 'TRY', annualRevenue: 35e9, fiscalYear: 2025 },
  { id: 'c_lalet', market: 'BIST', exchange: 'BIST', ticker: 'LALET', name: 'Lale Teknoloji', sector: 'technology', currency: 'TRY', annualRevenue: 6.8e9, fiscalYear: 2025 },
  { id: 'c_nwdx', market: 'US', exchange: 'NASDAQ', ticker: 'NWDX', name: 'Northwind Systems', sector: 'technology', currency: 'USD', annualRevenue: 14.2e9, fiscalYear: 2025 },
  { id: 'c_brpt', market: 'US', exchange: 'NASDAQ', ticker: 'BRPT', name: 'Brightpath Therapeutics', sector: 'health', currency: 'USD', annualRevenue: 0.9e9, fiscalYear: 2025 },
  { id: 'c_cbmt', market: 'US', exchange: 'NYSE', ticker: 'CBMT', name: 'Cobalt Motors', sector: 'automotive', currency: 'USD', annualRevenue: 38e9, fiscalYear: 2025 },
  { id: 'c_hbrc', market: 'US', exchange: 'NYSE', ticker: 'HBRC', name: 'Harbor Bancorp', sector: 'banking', currency: 'USD', annualRevenue: 6.1e9, fiscalYear: 2025 },
  { id: 'c_sgrd', market: 'US', exchange: 'NYSE', ticker: 'SGRD', name: 'Summit Grid Energy', sector: 'energy', currency: 'USD', annualRevenue: 3.4e9, fiscalYear: 2025 },
];

const KAP_URL = 'https://www.kap.org.tr/tr/';
const SEC_URL = 'https://www.sec.gov/edgar/search/';

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();

export const disclosures: Disclosure[] = [
  {
    id: 'd1', companyId: 'c_mvsvn', source: 'KAP', url: KAP_URL, language: 'tr', publishedAt: minutesAgo(12), session: 'regular',
    analysis: {
      stage: 'deep', eventType: 'contract', isRoutine: false, score: 9, sentiment: 'positive', amount: 9.3e9, amountCurrency: 'TRY',
      tr: {
        title: '9,3 milyar ₺ ihracat sözleşmesi',
        shortSummary: 'Yurt dışındaki bir müşteriyle zırhlı araç teslimatı için 9,3 milyar TL tutarında sözleşme imzalandı.',
        summary: 'Şirket, yurt dışındaki bir kamu müşterisiyle 9,3 milyar TL tutarında zırhlı araç tedarik sözleşmesi imzaladı. Teslimatların 2027–2029 yılları arasında üç yıla yayılarak yapılması planlanıyor. Sözleşme bedeli döviz cinsinden belirlenmiş, duyurudaki TL karşılığı imza günü kuruyla hesaplanmış.',
        whyItMatters: 'Tutar, şirketin son yıllık gelirinin yaklaşık %15\'i. Teslimatlar üç yıla yayıldığı için yıllık gelire etkisi ortalama %5 civarında olur. Sözleşme döviz cinsinden olduğu için şirketin ihracat payını artırıyor.',
        risks: [
          'Müşteri ülke ve sözleşme şartları duyuruda açıklanmamış; ihracat lisansı onayına bağlı olabilir.',
          'Teslimatlar 2027\'de başlıyor; bu yılın gelirine etkisi yok.',
          'TL karşılığı kur değişimine göre farklılaşacak.',
        ],
        notificationText: 'MVSVN (BIST) — Önem 9/10. 9,3 milyar ₺ ihracat sözleşmesi; son yıllık gelirin ~%15\'i, teslimat 2027–2029.',
      },
      en: {
        title: '₺9.3B export contract',
        shortSummary: 'Signed a ₺9.3 billion contract with a foreign customer for armored vehicle deliveries.',
        summary: 'The company signed a ₺9.3 billion armored vehicle supply contract with a foreign government customer. Deliveries are planned over three years, from 2027 to 2029. The contract is denominated in foreign currency; the TRY amount in the filing uses the exchange rate on the signing date.',
        whyItMatters: 'The amount equals roughly 15% of the company\'s last annual revenue. Spread over three years, the average annual impact is around 5% of revenue. Being FX-denominated, it raises the company\'s export share.',
        risks: [
          'The customer country and contract terms are not disclosed; the deal may depend on export license approval.',
          'Deliveries start in 2027, so there is no impact on this year\'s revenue.',
          'The TRY value will change with exchange rates.',
        ],
        notificationText: 'MVSVN (BIST) — Importance 9/10. ₺9.3B export contract; ~15% of last annual revenue, deliveries 2027–2029.',
      },
    },
  },
  {
    id: 'd8', companyId: 'c_brpt', source: 'SEC', formType: '8-K', url: SEC_URL, language: 'en', publishedAt: minutesAgo(55), session: 'pre_market',
    analysis: {
      stage: 'deep', eventType: 'regulatory_approval', isRoutine: false, score: 9, sentiment: 'positive', amount: null, amountCurrency: null,
      tr: {
        title: 'Ana ilaca FDA onayı',
        shortSummary: 'Şirketin geç evre ilacı BPX-201, FDA\'dan pazarlama onayı aldı.',
        summary: 'Şirket, kronik böbrek hastalığına bağlı anemi tedavisi için geliştirdiği BPX-201 ilacının ABD Gıda ve İlaç Dairesi (FDA) tarafından onaylandığını bildirdi. Satışlara 2027\'nin ilk çeyreğinde başlanması planlanıyor. Onay, şirketin klinik çalışmalarda önerdiği dozlama ile birebir aynı.',
        whyItMatters: 'BPX-201, şirketin ilk ticari ilacı olacak; mevcut gelirinin tamamı ortaklık ve lisans ödemelerinden geliyor. Onay, şirketin gelir modelini lisans gelirinden ürün satışına çeviriyor.',
        risks: [
          'Duyuruda fiyatlandırma ve sigorta geri ödeme kapsamı hakkında bilgi yok.',
          'Satışların başlaması için üretim kapasitesinin hazırlanması gerekiyor.',
          'FDA onayı ek bir pazarlama sonrası güvenlik çalışması şartı içeriyor.',
        ],
        notificationText: 'BRPT (NASDAQ) — Önem 9/10. Ana ilaç BPX-201 FDA onayı aldı; satışların 2027 başında başlaması planlanıyor.',
      },
      en: {
        title: 'FDA approval for lead drug',
        shortSummary: 'The company\'s late-stage drug BPX-201 received FDA marketing approval.',
        summary: 'The company announced that the U.S. Food and Drug Administration approved BPX-201 for anemia caused by chronic kidney disease. Commercial launch is planned for the first quarter of 2027. The approved dosing matches the regimen proposed in clinical trials.',
        whyItMatters: 'BPX-201 will be the company\'s first commercial product; all current revenue comes from partnership and licensing payments. The approval shifts the business model from licensing income to product sales.',
        risks: [
          'The filing gives no information on pricing or insurance reimbursement.',
          'Manufacturing capacity must be readied before launch.',
          'The approval includes a required post-marketing safety study.',
        ],
        notificationText: 'BRPT (NASDAQ) — Importance 9/10. Lead drug BPX-201 approved by FDA; launch planned for early 2027.',
      },
    },
  },
  {
    id: 'd7', companyId: 'c_nwdx', source: 'SEC', formType: '8-K', url: SEC_URL, language: 'en', publishedAt: minutesAgo(95), session: 'after_hours',
    analysis: {
      stage: 'deep', eventType: 'earnings', isRoutine: false, score: 8, sentiment: 'positive', amount: null, amountCurrency: null,
      tr: {
        title: '3. çeyrek sonuçları ve yükseltilen yıllık beklenti',
        shortSummary: 'Çeyreklik gelir yıllık %12 artışla 3,9 milyar dolar oldu; yıllık gelir beklentisi yükseltildi.',
        summary: 'Şirketin 3. çeyrek geliri, geçen yılın aynı dönemine göre %12 artışla 3,9 milyar dolar oldu. Net kâr %18 artışla 610 milyon dolara yükseldi. Şirket, yıllık gelir beklentisini 15,1–15,4 milyar dolardan 15,5–15,7 milyar dolara çıkardı.',
        whyItMatters: 'Yıllık beklentinin üst sınırı yaklaşık %2 yükseltildi. Bulut abonelik gelirleri %24 büyüyerek toplam gelirin %41\'ine ulaştı; büyümenin büyük kısmı bu kalemden geliyor.',
        risks: [
          'Donanım satışları yıllık %6 geriledi.',
          'Brüt kâr marjı, artan veri merkezi maliyetleri nedeniyle 1,1 puan düştü.',
        ],
        notificationText: 'NWDX (NASDAQ) — Önem 8/10. 3. çeyrek geliri +%12 (3,9 mlr $); yıllık gelir beklentisi yükseltildi.',
      },
      en: {
        title: 'Q3 results and raised full-year guidance',
        shortSummary: 'Quarterly revenue rose 12% year over year to $3.9B; full-year revenue guidance was raised.',
        summary: 'Third-quarter revenue rose 12% year over year to $3.9 billion. Net income increased 18% to $610 million. The company raised its full-year revenue guidance from $15.1–15.4 billion to $15.5–15.7 billion.',
        whyItMatters: 'The top end of full-year guidance was raised by about 2%. Cloud subscription revenue grew 24% and reached 41% of total revenue; most of the growth comes from this line.',
        risks: [
          'Hardware sales fell 6% year over year.',
          'Gross margin declined 1.1 points due to higher data center costs.',
        ],
        notificationText: 'NWDX (NASDAQ) — Importance 8/10. Q3 revenue +12% ($3.9B); full-year revenue guidance raised.',
      },
    },
  },
  {
    id: 'd4', companyId: 'c_trsgd', source: 'KAP', url: KAP_URL, language: 'tr', publishedAt: minutesAgo(140), session: 'regular',
    analysis: {
      stage: 'deep', eventType: 'litigation_penalty', isRoutine: false, score: 7, sentiment: 'negative', amount: 480e6, amountCurrency: 'TRY',
      tr: {
        title: '480 milyon ₺ rekabet cezası',
        shortSummary: 'Rekabet Kurumu, şirkete 480 milyon TL idari para cezası verdi.',
        summary: 'Rekabet Kurumu, bölgesel bayilerle fiyat koordinasyonu yapıldığı gerekçesiyle şirkete 480 milyon TL idari para cezası verdi. Şirket karara itiraz edeceğini açıkladı. Ceza 30 gün içinde ödenirse %25 indirim uygulanabiliyor.',
        whyItMatters: 'Ceza, şirketin son yıllık gelirinin yaklaşık %2,3\'ü; net kâra etkisi bundan daha yüksek olacaktır. Karar, şirketin bayi satış modelinde değişiklik gerektirebilir.',
        risks: [
          'Kararda bayi sözleşmelerinin değiştirilmesi de istenmiş; satış kanalına etkisi belirsiz.',
          'İtiraz süreci uzun sürebilir; ceza karşılığı ayrılması gerekecek.',
        ],
        notificationText: 'TRSGD (BIST) — Önem 7/10. 480 milyon ₺ rekabet cezası; son yıllık gelirin ~%2,3\'ü. Şirket itiraz edecek.',
      },
      en: {
        title: '₺480M competition fine',
        shortSummary: 'The Turkish Competition Authority fined the company ₺480 million.',
        summary: 'The Competition Authority fined the company ₺480 million for coordinating prices with regional distributors. The company said it will appeal. A 25% discount applies if the fine is paid within 30 days.',
        whyItMatters: 'The fine equals about 2.3% of last annual revenue, and its impact on net profit will be larger. The ruling may require changes to the company\'s distributor sales model.',
        risks: [
          'The ruling also orders changes to distributor contracts; the effect on sales channels is unclear.',
          'The appeal may take a long time, and a provision will have to be booked.',
        ],
        notificationText: 'TRSGD (BIST) — Importance 7/10. ₺480M competition fine; ~2.3% of last annual revenue. Company will appeal.',
      },
    },
  },
  {
    id: 'd10', companyId: 'c_hbrc', source: 'SEC', formType: '8-K', url: SEC_URL, language: 'en', publishedAt: minutesAgo(190), session: 'regular',
    analysis: {
      stage: 'deep', eventType: 'management_change', isRoutine: false, score: 7, sentiment: 'negative', amount: null, amountCurrency: null,
      tr: {
        title: 'CEO derhal geçerli olmak üzere istifa etti',
        shortSummary: 'CEO görevinden ayrıldı; finans direktörü geçici CEO olarak atandı.',
        summary: 'Şirketin CEO\'su derhal geçerli olmak üzere görevinden istifa etti. Yönetim kurulu, finans direktörünü kalıcı bir isim bulunana kadar geçici CEO olarak atadı. Duyuruda istifanın nedeni belirtilmedi.',
        whyItMatters: 'Planlı olmayan ve gerekçesi açıklanmayan üst düzey ayrılıklar, şirketin stratejisi ve yürütülen birleşme görüşmeleri konusunda belirsizlik yaratır.',
        risks: [
          'Finans direktörü iki görevi birlikte yürütecek.',
          'Şirketin geçen ay açıkladığı bölgesel banka satın alma süreci etkilenebilir.',
        ],
        notificationText: 'HBRC (NYSE) — Önem 7/10. CEO derhal istifa etti; finans direktörü geçici CEO. Neden açıklanmadı.',
      },
      en: {
        title: 'CEO resigns effective immediately',
        shortSummary: 'The CEO stepped down; the CFO was named interim CEO.',
        summary: 'The company\'s CEO resigned effective immediately. The board appointed the CFO as interim CEO until a permanent successor is found. The filing does not give a reason for the resignation.',
        whyItMatters: 'Unplanned senior departures without a stated reason create uncertainty about strategy and ongoing acquisition talks.',
        risks: [
          'The CFO will hold both roles at the same time.',
          'The regional bank acquisition announced last month may be affected.',
        ],
        notificationText: 'HBRC (NYSE) — Importance 7/10. CEO resigned effective immediately; CFO named interim CEO. No reason given.',
      },
    },
  },
  {
    id: 'd9', companyId: 'c_cbmt', source: 'SEC', formType: '8-K', url: SEC_URL, language: 'en', publishedAt: minutesAgo(260), session: 'regular',
    analysis: {
      stage: 'deep', eventType: 'recall', isRoutine: false, score: 7, sentiment: 'negative', amount: 340e6, amountCurrency: 'USD',
      tr: {
        title: '210 bin aracı geri çağırma',
        shortSummary: 'Fren yazılımı sorunu nedeniyle 210 bin araç geri çağrılıyor; tahmini maliyet 340 milyon dolar.',
        summary: 'Şirket, fren kontrol yazılımındaki bir hata nedeniyle 2024–2025 model yılı 210 bin aracı geri çağırıyor. Tahmini maliyet 340 milyon dolar ve 4. çeyrekte gider olarak kaydedilecek. Düzeltmenin büyük kısmı uzaktan yazılım güncellemesiyle yapılabilecek.',
        whyItMatters: 'Maliyet, son yıllık gelirin yaklaşık %0,9\'u; tek başına küçük ama 4. çeyrek kârını doğrudan düşürecek. Güvenlikle ilgili geri çağırmalar marka algısını etkileyebilir.',
        risks: [
          'Düzenleyici kurumun ek inceleme başlatıp başlatmayacağı belirsiz.',
          'Uzaktan güncellemenin yetmediği araçlarda servis maliyeti tahmini aşabilir.',
        ],
        notificationText: 'CBMT (NYSE) — Önem 7/10. 210 bin araç geri çağrılıyor; tahmini maliyet 340 mln $ (gelirin ~%0,9\'u).',
      },
      en: {
        title: 'Recall of 210,000 vehicles',
        shortSummary: 'A brake software defect triggers a recall of 210,000 vehicles; estimated cost $340M.',
        summary: 'The company is recalling 210,000 model-year 2024–2025 vehicles because of a defect in brake control software. The estimated cost is $340 million and will be booked as an expense in Q4. Most fixes can be delivered with an over-the-air software update.',
        whyItMatters: 'The cost equals about 0.9% of last annual revenue; small on its own but a direct hit to Q4 profit. Safety-related recalls can affect brand perception.',
        risks: [
          'It is unclear whether the regulator will open an additional investigation.',
          'Service costs may exceed the estimate for vehicles that cannot be fixed remotely.',
        ],
        notificationText: 'CBMT (NYSE) — Importance 7/10. Recall of 210K vehicles; estimated cost $340M (~0.9% of revenue).',
      },
    },
  },
  {
    id: 'd5', companyId: 'c_egbnk', source: 'KAP', url: KAP_URL, language: 'tr', publishedAt: minutesAgo(380), session: 'regular',
    analysis: {
      stage: 'deep', eventType: 'earnings', isRoutine: false, score: 7, sentiment: 'positive', amount: null, amountCurrency: null,
      tr: {
        title: '3. çeyrek finansal sonuçları',
        shortSummary: 'Çeyreklik net kâr yıllık %38 artışla 4,1 milyar TL; bunun 1,2 milyar TL\'si tek seferlik gayrimenkul satışından.',
        summary: 'Banka, 3. çeyrekte geçen yılın aynı dönemine göre %38 artışla 4,1 milyar TL net kâr açıkladı. Kârın 1,2 milyar TL\'si genel müdürlük binasının satışından elde edilen tek seferlik gelir. Net faiz geliri %9 arttı.',
        whyItMatters: 'Tek seferlik gelir hariç tutulduğunda net kâr 2,9 milyar TL ve yıllık artış yaklaşık %2. Yani manşetteki %38 artışın büyük kısmı tekrarlanmayacak bir kalemden geliyor.',
        risks: [
          'Takipteki kredi oranı %2,1\'den %2,8\'e yükseldi.',
          'Kredi büyümesi enflasyonun altında kaldı.',
        ],
        notificationText: 'EGBNK (BIST) — Önem 7/10. Net kâr +%38 (4,1 mlr ₺), ancak 1,2 mlr ₺\'si tek seferlik bina satışından.',
      },
      en: {
        title: 'Q3 financial results',
        shortSummary: 'Quarterly net profit rose 38% to ₺4.1B; ₺1.2B of it came from a one-off property sale.',
        summary: 'The bank reported Q3 net profit of ₺4.1 billion, up 38% year over year. ₺1.2 billion of the profit is a one-off gain from selling its headquarters building. Net interest income rose 9%.',
        whyItMatters: 'Excluding the one-off gain, net profit was ₺2.9 billion, up about 2% year over year. Most of the headline 38% increase comes from an item that will not repeat.',
        risks: [
          'The non-performing loan ratio rose from 2.1% to 2.8%.',
          'Loan growth stayed below inflation.',
        ],
        notificationText: 'EGBNK (BIST) — Importance 7/10. Net profit +38% (₺4.1B), but ₺1.2B is a one-off building sale.',
      },
    },
  },
  {
    id: 'd3', companyId: 'c_kzyen', source: 'KAP', url: KAP_URL, language: 'tr', publishedAt: minutesAgo(300), session: 'regular',
    analysis: {
      stage: 'deep', eventType: 'bonus_issue', isRoutine: false, score: 6, sentiment: 'neutral', amount: null, amountCurrency: null,
      tr: {
        title: '%200 bedelsiz sermaye artırımı başvurusu',
        shortSummary: 'Sermayenin 1,5 milyar TL\'den 4,5 milyar TL\'ye bedelsiz artırılması için SPK\'ya başvuruldu.',
        summary: 'Yönetim kurulu, çıkarılmış sermayenin 1,5 milyar TL\'den 4,5 milyar TL\'ye (%200) iç kaynaklardan bedelsiz artırılmasına karar verdi ve SPK\'ya başvurdu. Onay gelirse her 1 pay için 2 yeni pay verilecek.',
        whyItMatters: 'Bedelsiz sermaye artırımı şirketin değerini veya kârını değiştirmez; aynı değer daha fazla paya bölünür ve pay fiyatı buna göre düzeltilir. Yatırımcı ilgisi açısından takip edilen bir olaydır.',
        risks: [
          'SPK onay süresi belirsiz; başvuru reddedilebilir veya oran değişebilir.',
        ],
        notificationText: 'KZYEN (BIST) — Önem 6/10. %200 bedelsiz için SPK\'ya başvuruldu. Şirket değerini değiştirmez.',
      },
      en: {
        title: 'Application for 200% bonus share issue',
        shortSummary: 'Applied to the CMB to raise capital from ₺1.5B to ₺4.5B through a bonus issue.',
        summary: 'The board decided to raise issued capital from ₺1.5 billion to ₺4.5 billion (200%) from internal resources and applied to the Capital Markets Board. If approved, shareholders will receive 2 new shares for each share held.',
        whyItMatters: 'A bonus issue does not change the company\'s value or profit; the same value is split across more shares and the share price is adjusted accordingly. It is an event many investors follow.',
        risks: [
          'The approval timeline is unknown; the application may be rejected or the ratio changed.',
        ],
        notificationText: 'KZYEN (BIST) — Importance 6/10. Applied for a 200% bonus issue. Does not change company value.',
      },
    },
  },
  {
    id: 'd11', companyId: 'c_sgrd', source: 'SEC', formType: '8-K', url: SEC_URL, language: 'en', publishedAt: minutesAgo(520), session: 'regular',
    analysis: {
      stage: 'deep', eventType: 'debt_financing', isRoutine: false, score: 6, sentiment: 'neutral', amount: 1.1e9, amountCurrency: 'USD',
      tr: {
        title: '1,1 milyar dolarlık tahvil ihracı',
        shortSummary: '2033 vadeli, %6,25 kuponlu 1,1 milyar dolarlık tahvil ihraç edildi.',
        summary: 'Şirket, 2033 vadeli ve yıllık %6,25 faizli 1,1 milyar dolarlık tahvil ihracını tamamladı. Gelirin 700 milyon dolarının 2026 sonunda vadesi dolan borcun kapatılmasında, kalanının yeni güneş santrali yatırımlarında kullanılacağı belirtildi.',
        whyItMatters: 'Tutar son yıllık gelirin yaklaşık %32\'si. Borcun büyük kısmı yeniden finansman; net borç artışı yaklaşık 400 milyon dolar. Yeni kupon oranı, kapatılan borcun %4,1\'lik faizinden yüksek.',
        risks: [
          'Faiz giderleri yükselecek.',
          'Yatırımların ne zaman gelir üreteceği duyuruda belirtilmemiş.',
        ],
        notificationText: 'SGRD (NYSE) — Önem 6/10. 1,1 mlr $ tahvil (%6,25); çoğu mevcut borcun yeniden finansmanı.',
      },
      en: {
        title: '$1.1B bond offering',
        shortSummary: 'Issued $1.1 billion of 6.25% senior notes due 2033.',
        summary: 'The company completed a $1.1 billion offering of 6.25% senior notes due 2033. $700 million of the proceeds will repay debt maturing at the end of 2026; the rest will fund new solar projects.',
        whyItMatters: 'The amount equals about 32% of last annual revenue. Most of it is refinancing; the net increase in debt is about $400 million. The new coupon is higher than the 4.1% rate on the debt being repaid.',
        risks: [
          'Interest expense will rise.',
          'The filing does not say when the new projects will generate revenue.',
        ],
        notificationText: 'SGRD (NYSE) — Importance 6/10. $1.1B notes at 6.25%; mostly refinancing existing debt.',
      },
    },
  },
  {
    id: 'd6', companyId: 'c_lalet', source: 'KAP', url: KAP_URL, language: 'tr', publishedAt: minutesAgo(640), session: 'regular',
    analysis: {
      stage: 'deep', eventType: 'buyback', isRoutine: false, score: 5, sentiment: 'positive', amount: 150e6, amountCurrency: 'TRY',
      tr: {
        title: '150 milyon ₺ pay geri alım programı',
        shortSummary: 'Şirket, 12 ay içinde en fazla 150 milyon TL\'lik pay geri alımı yapacak.',
        summary: 'Yönetim kurulu, önümüzdeki 12 ay içinde en fazla 150 milyon TL ve en fazla 2 milyon adet pay geri alımı yapılmasına karar verdi. Alımlar şirketin kendi nakit kaynaklarıyla yapılacak.',
        whyItMatters: 'Program tutarı son yıllık gelirin yaklaşık %2,2\'si. Geri alım bir üst sınırdır; şirketin bu tutarın tamamını kullanma zorunluluğu yoktur.',
        risks: [
          'Gerçekleşen alım miktarı programdan düşük kalabilir.',
        ],
        notificationText: 'LALET (BIST) — Önem 5/10. 150 milyon ₺\'ye kadar pay geri alım programı.',
      },
      en: {
        title: '₺150M share buyback program',
        shortSummary: 'The company will buy back up to ₺150 million of shares over 12 months.',
        summary: 'The board approved buying back up to ₺150 million, and at most 2 million shares, over the next 12 months. Purchases will be funded from the company\'s own cash.',
        whyItMatters: 'The program equals about 2.2% of last annual revenue. A buyback is a ceiling; the company is not required to use the full amount.',
        risks: [
          'Actual purchases may fall short of the program size.',
        ],
        notificationText: 'LALET (BIST) — Importance 5/10. Share buyback program of up to ₺150M.',
      },
    },
  },
  {
    id: 'd2', companyId: 'c_ankhv', source: 'KAP', url: KAP_URL, language: 'tr', publishedAt: minutesAgo(700), session: 'regular',
    analysis: {
      stage: 'deep', eventType: 'contract', isRoutine: false, score: 4, sentiment: 'neutral', amount: 2.1e9, amountCurrency: 'TRY',
      tr: {
        title: '2,1 milyar ₺ uçak bakım sözleşmesi',
        shortSummary: 'Yabancı bir havayoluyla 5 yıllık uçak bakım hizmeti sözleşmesi imzalandı.',
        summary: 'Şirketin bakım iştiraki, yabancı bir havayoluyla toplam 2,1 milyar TL tutarında 5 yıllık uçak bakım hizmeti sözleşmesi imzaladı.',
        whyItMatters: 'Tutar büyük görünse de şirketin son yıllık gelirinin yalnızca yaklaşık %0,5\'i ve 5 yıla yayılıyor. Şirket ölçeğinde sınırlı bir etkisi var.',
        risks: [
          'Sözleşmenin kârlılığı hakkında bilgi verilmemiş.',
        ],
        notificationText: 'ANKHV (BIST) — Önem 4/10. 2,1 milyar ₺ 5 yıllık bakım sözleşmesi; gelirin ~%0,5\'i.',
      },
      en: {
        title: '₺2.1B aircraft maintenance contract',
        shortSummary: 'Signed a five-year aircraft maintenance contract with a foreign airline.',
        summary: 'The company\'s maintenance subsidiary signed a five-year aircraft maintenance contract worth ₺2.1 billion in total with a foreign airline.',
        whyItMatters: 'The amount sounds large, but it is only about 0.5% of last annual revenue and is spread over five years. The impact is limited at the company\'s scale.',
        risks: [
          'No information is given on the contract\'s profitability.',
        ],
        notificationText: 'ANKHV (BIST) — Importance 4/10. ₺2.1B five-year maintenance contract; ~0.5% of revenue.',
      },
    },
  },
  {
    id: 'd12', companyId: 'c_kzyen', source: 'KAP', url: KAP_URL, language: 'tr', publishedAt: minutesAgo(760), session: 'closed',
    analysis: {
      stage: 'screen', eventType: 'routine', isRoutine: true, score: 1, sentiment: 'neutral', amount: null, amountCurrency: null,
      tr: { title: 'Genel kurul tescili', shortSummary: 'Olağan genel kurul toplantısının ticaret siciline tescil edildiği bildirildi.', summary: 'Olağan genel kurul toplantısının ticaret siciline tescil edildiği bildirildi.', whyItMatters: '', risks: [], notificationText: '' },
      en: { title: 'General meeting registration', shortSummary: 'The annual general meeting was registered with the trade registry.', summary: 'The annual general meeting was registered with the trade registry.', whyItMatters: '', risks: [], notificationText: '' },
    },
  },
  {
    id: 'd13', companyId: 'c_nwdx', source: 'SEC', formType: '4', url: SEC_URL, language: 'en', publishedAt: minutesAgo(820), session: 'closed',
    analysis: {
      stage: 'screen', eventType: 'routine', isRoutine: true, score: 2, sentiment: 'neutral', amount: null, amountCurrency: null,
      tr: { title: 'Yönetici pay işlemi bildirimi', shortSummary: 'Bir yönetim kurulu üyesi, önceden planlanmış satış programı kapsamında pay sattı.', summary: 'Bir yönetim kurulu üyesi, önceden planlanmış satış programı kapsamında pay sattı.', whyItMatters: '', risks: [], notificationText: '' },
      en: { title: 'Insider transaction report', shortSummary: 'A director sold shares under a pre-arranged trading plan.', summary: 'A director sold shares under a pre-arranged trading plan.', whyItMatters: '', risks: [], notificationText: '' },
    },
  },
  {
    id: 'd14', companyId: 'c_egbnk', source: 'KAP', url: KAP_URL, language: 'tr', publishedAt: minutesAgo(900), session: 'closed',
    analysis: {
      stage: 'screen', eventType: 'routine', isRoutine: true, score: 2, sentiment: 'neutral', amount: null, amountCurrency: null,
      tr: { title: 'Borçlanma aracı ihracı sonucu', shortSummary: 'Daha önce duyurulan kısa vadeli bono ihracının tamamlandığı bildirildi.', summary: 'Daha önce duyurulan kısa vadeli bono ihracının tamamlandığı bildirildi.', whyItMatters: '', risks: [], notificationText: '' },
      en: { title: 'Debt issuance result', shortSummary: 'A previously announced short-term bill issuance was completed.', summary: 'A previously announced short-term bill issuance was completed.', whyItMatters: '', risks: [], notificationText: '' },
    },
  },
  {
    id: 'd15', companyId: 'c_trsgd', source: 'KAP', url: KAP_URL, language: 'tr', publishedAt: minutesAgo(2900), session: 'regular',
    analysis: {
      stage: 'deep', eventType: 'earnings', isRoutine: false, score: 6, sentiment: 'negative', amount: null, amountCurrency: null,
      tr: {
        title: '3. çeyrek finansal sonuçları',
        shortSummary: 'Satışlar yıllık %31 arttı ancak net kâr %22 geriledi.',
        summary: 'Şirketin 3. çeyrek satışları yıllık %31 artışla 5,6 milyar TL oldu. Hammadde maliyetlerindeki artış nedeniyle net kâr %22 azalarak 310 milyon TL\'ye geriledi.',
        whyItMatters: 'Satışlar enflasyona yakın arttı ama brüt kâr marjı %24\'ten %19\'a düştü; şirket maliyet artışını fiyatlara tam yansıtamadı.',
        risks: ['Hammadde fiyatlarındaki artışın 4. çeyrekte de sürdüğü belirtildi.'],
        notificationText: 'TRSGD (BIST) — Önem 6/10. Satışlar +%31, net kâr −%22; brüt marj 5 puan düştü.',
      },
      en: {
        title: 'Q3 financial results',
        shortSummary: 'Sales rose 31% year over year, but net profit fell 22%.',
        summary: 'Third-quarter sales rose 31% year over year to ₺5.6 billion. Higher raw material costs cut net profit by 22% to ₺310 million.',
        whyItMatters: 'Sales grew roughly in line with inflation, but gross margin fell from 24% to 19%; the company could not fully pass cost increases on to prices.',
        risks: ['The company said raw material price increases continued into Q4.'],
        notificationText: 'TRSGD (BIST) — Importance 6/10. Sales +31%, net profit −22%; gross margin down 5 points.',
      },
    },
  },
];

export const digests: MarketDigest[] = [
  {
    market: 'BIST',
    tr: 'Mavi Savunma\'nın son yıllık gelirinin yaklaşık %15\'ine denk gelen ihracat sözleşmesi günün en önemli duyurusu. Toros Gıda\'ya verilen 480 milyon TL\'lik rekabet cezası ve Ege Yatırım Bankası\'nın büyük kısmı tek seferlik gelirden gelen kâr artışı da öne çıkıyor.',
    en: 'Mavi Savunma\'s export contract, worth about 15% of its last annual revenue, is the most important filing of the day. Toros Gıda\'s ₺480M competition fine and Ege Yatırım Bankası\'s profit jump, driven mostly by a one-off gain, also stand out.',
  },
  {
    market: 'US',
    tr: 'Brightpath Therapeutics\'in ilk ticari ilacı için aldığı FDA onayı ve Northwind Systems\'in yıllık beklentisini yükselttiği çeyrek sonuçları öne çıkıyor. Harbor Bancorp\'ta CEO\'nun gerekçesiz istifası ve Cobalt Motors\'un 210 bin araçlık geri çağırması olumsuz gelişmeler arasında.',
    en: 'Brightpath Therapeutics\' FDA approval for its first commercial drug and Northwind Systems\' quarterly results with raised guidance lead the day. Harbor Bancorp\'s unexplained CEO resignation and Cobalt Motors\' 210,000-vehicle recall are among the negative developments.',
  },
];
