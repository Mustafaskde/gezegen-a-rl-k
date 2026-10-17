# Finans Yönetimi

Gelirleri, giderleri, banka hesaplarını, cari hesapları, yaklaşan ödeme ve tahsilatları tek yerden
yönetmek; finansal rapor almak ve nakit akışını anlık izlemek için modern bir web uygulaması.

## Özellikler

| Modül | Neler yapılabilir |
|---|---|
| **Genel Bakış** | Toplam nakit, bu ayın gelir/gider/net durumu, açık alacak–borç, 30 gün sonrası tahmini bakiye, gecikme ve nakit açığı uyarıları, son işlemler |
| **Nakit Akışı** | Son 90 günün gerçekleşen bakiyesi + 30/60/90/180 günlük tahmin, aylık açılış/giriş/çıkış/kapanış tablosu, kümülatif bakiyeli planlı hareketler, eksiye düşme uyarısı |
| **Gelir & Gider** | Gelir, gider ve hesaplar arası (dövizli dahil) transfer kaydı; tür, tarih, hesap, kategori, cari ve metin filtreleri; CSV dışa aktarım |
| **Ödeme & Tahsilat** | Vadeli alacak/borç, çek, tekrarlayan (haftalık/aylık/yıllık) ödemeler; gecikmiş / bu hafta / 30 gün gruplaması, takvim görünümü, kısmi ödeme, tek tıkla tahsil et / öde |
| **Banka & Kasa** | Banka hesabı, nakit kasa, kredi kartı; TRY/USD/EUR, IBAN kopyalama, son 30 gün giriş/çıkış, arşivleme |
| **Cari Hesaplar** | Müşteri/tedarikçi kartları, açık alacak/borç ve gecikmiş tutarlar, yürüyen bakiyeli cari ekstre (CSV/yazdır), peşin işlemler |
| **Raporlar** | Önceki dönemle karşılaştırmalı gelir tablosu, kategori dağılımı, aylık trend, alacak/borç yaşlandırma (0–30–60–90+ gün), hesap özeti; CSV ve yazdır/PDF |
| **Ayarlar** | Şirket adı, döviz kurları, açık/koyu tema, kategori yönetimi, JSON yedek alma/geri yükleme, demo veri |

### Nasıl çalışır

- **Hesap bakiyesi** = açılış bakiyesi + gelirler − giderler ± transferler.
- **Cari bakiye**, cariye bağlı vadeli kayıtların kalan tutarlarından oluşur. Bir vadeli kayıt
  "Tahsil et / Öde" ile kapatıldığında seçilen hesaba işlem yazılır ve kaydın ödenen tutarı artar;
  bu işlem silinirse ödeme geri alınır.
- **Tekrarlayan kayıtlar** tamamen kapandığında bir sonraki dönem otomatik oluşturulur. Henüz
  oluşmamış dönemler nakit tahminine ve takvime "öngörülen" olarak yansır.
- Döviz tutarları raporlarda ve toplamlarda Ayarlar'daki güncel kurla TL'ye çevrilir.
- Veriler tarayıcının `localStorage` alanında tutulur; birden çok sekmede açıkken değişiklikler
  anında senkronize olur. Düzenli olarak **Ayarlar → Yedeği indir** ile yedek almanız önerilir.

## Geliştirme

```bash
cd finans
npm install
npm run dev        # http://localhost:5173
npm test           # hesaplama ve kayıt mantığı testleri
npm run build      # dist/ altında statik derleme
```

Teknolojiler: React 18, TypeScript, Vite, Recharts, lucide-react. Sunucu gerektirmez; `dist/`
klasörü herhangi bir statik barındırmaya yüklenebilir.
