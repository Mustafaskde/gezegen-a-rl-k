# Finans Merkezi

Gelirleri, giderleri, banka hesaplarını, cari hesapları, yaklaşan ödeme ve tahsilatları tek yerden
yönetmek, finansal rapor almak ve nakit akışını anlık izlemek için bir web uygulaması. İçinde
**bilgisayarınızda çalışan** bir yapay zekâ asistanı vardır; verileriniz dışarı gönderilmez.

## Windows'ta çalıştırma

1. **Node.js** kurun: <https://nodejs.org> → "LTS" sürümü.
2. **Ollama** kurun (yapay zekâ için): <https://ollama.com/download> → Windows. Kurulumdan sonra
   arka planda kendiliğinden çalışır.
3. `finans` klasöründeki **`baslat.bat`** dosyasına çift tıklayın.
   - İlk açılışta gerekli paketleri kurar.
   - `qwen2.5:14b` modeli yüklü değilse indirmek isteyip istemediğinizi sorar (~9 GB, bir kez).
   - Uygulamayı tarayıcıda `http://localhost:5173` adresinde açar.

Modeli elle indirmek isterseniz Komut İstemi'nde:

```
ollama pull qwen2.5:14b
```

### Hangi model?

| Model | İndirme | Bellek | Not |
|---|---|---|---|
| `qwen2.5:14b` | ~9 GB | ~10–11 GB | Varsayılan. En iyi Türkçe yorum. RTX 5060 (8 GB) + 16 GB RAM'de modelin bir kısmı ekran kartına, kalanı RAM'e yüklenir. |
| `qwen2.5:7b` | ~4,7 GB | ~5–6 GB | Tamamen ekran kartına sığar, daha hızlı. 14B yavaş gelirse buna geçin. |

Model, **Ayarlar → Yapay zekâ asistanı** bölümünden tek tıkla değiştirilir. Ekran kartının
kullanılması için güncel NVIDIA sürücüsü ve güncel Ollama sürümü gerekir.

## Özellikler

| Modül | Neler yapılabilir |
|---|---|
| **Genel Bakış** | Nakit, gelir, gider, net sonuç, açık alacak/borç; nakit pozisyonu grafiği; **giderlerin kategorilere yüzde dağılımı** (zorunlu / isteğe bağlı ayrımıyla); asistan bulguları; finansal göstergeler (nakit yeterlilik süresi, ortalama tahsilat süresi, gider/gelir oranı); bütçe takibi |
| **Finans Asistanı** | "Bu ay gereksiz harcamalarım neler?", "Giderlerim nereye gidiyor?", "30 gün sonra nakit durumum?" gibi sorulara cevap verir. İstenirse **kayıt ekler**: "Akbank vadesiz hesabım var, bakiyesi 85 bin TL, ekle", "Dün 2.400 TL akaryakıt harcadım", "15 Aralık'ta Demir Çelik'e 40 bin TL ödeme planla" |
| **Nakit Akışı** | Gerçekleşen bakiye + 30/60/90/180 günlük tahmin, aylık açılış/giriş/çıkış/kapanış tablosu, nakit açığı uyarısı |
| **Gelir & Gider** | Gelir, gider ve (dövizli dahil) transfer kayıtları; filtreler; CSV |
| **Ödeme & Tahsilat** | Vadeli alacak/borç, çek, tekrarlayan ödemeler; liste ve takvim; kısmi ödeme |
| **Banka & Kasa** | Banka hesabı, kasa, kredi kartı; TRY/USD/EUR |
| **Cari Hesaplar** | Müşteri/tedarikçi bakiyeleri, gecikmiş tutarlar, cari ekstre |
| **Raporlar** | Karşılaştırmalı gelir tablosu, aylık trend, alacak/borç yaşlandırma, hesap özeti |
| **Ayarlar** | Kategori bütçeleri ve zorunlu/isteğe bağlı işareti, döviz kurları, tema, yapay zekâ ayarları, JSON yedek |

## Asistan nasıl çalışır?

1. **Uygulama hesaplar:** kategori payları, geçen aya göre değişim, mükerrer olabilecek ödemeler,
   kategorinin tipik tutarını aşan harcamalar, abonelik benzeri düzenli ödemeler, bütçe aşımları,
   nakit tahmini. Kod: `src/lib/insights.ts`.
2. **Yerel model yorumlar:** Qwen bu hesaplanmış özetleri alır, Türkçe cevap ve öneri yazar. Kendi
   sayı üretmesi istenmez; küçük modellerin hesap hatası bu sayede cevaplara yansımaz.
3. **Ollama kapalıysa** asistan aynı bulgularla modelsiz (yerleşik analiz) cevap verir.

**Kayıt ekleme:** Asistan isteğinizden bir kayıt önerisi çıkarır (Ollama varsa model, yoksa kural
tabanlı ayrıştırıcı) ve bir **onay kartı** gösterir. Kayıt yalnızca **Ekle**'ye bastığınızda
yazılır; model hiçbir kaydı kendi başına ekleyemez, silemez veya değiştiremez.

**Gizlilik:** Uygulama yalnızca bu bilgisayardaki Ollama adresine (`localhost`) bağlanır; başka bir
adres girilirse reddeder. Veriler tarayıcının yerel depolamasında tutulur. Düzenli olarak
**Ayarlar → Yedeği indir** ile yedek alın.

### Sorun giderme

- **"Ollama kapalı" görünüyor:** Başlat menüsünden Ollama'yı açın veya Komut İstemi'nde
  `ollama serve` çalıştırın, sonra Ayarlar'da "Tekrar dene"ye basın.
- **"Model yüklü değil":** `ollama pull qwen2.5:14b`
- **Cevaplar yavaş:** Ayarlar'dan `qwen2.5:7b` seçin (`ollama pull qwen2.5:7b`).
- **Uygulamayı farklı bir adresten açıyorsanız** ve Ollama bağlantıyı reddediyorsa, Ollama'yı
  `OLLAMA_ORIGINS` ortam değişkeniyle o adrese izin verecek şekilde başlatın.

## Geliştirme

```bash
cd finans
npm install
npm run dev        # http://localhost:5173
npm test           # hesaplama, analiz ve kayıt ayrıştırma testleri
npm run build      # dist/ altında statik derleme
```

Teknolojiler: React 18, TypeScript, Vite, Recharts, lucide-react, Plus Jakarta Sans (uygulamaya
gömülü, internet gerektirmez), yerel model için Ollama.
