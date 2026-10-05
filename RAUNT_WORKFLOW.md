# Raunt Ödev İş Akışı

Bu dosya, Raunt'ta ödev yönetimi için kullanıcının **gösterdiği** ekranları, tıklamaları ve
beklenen sonuçları kaydeder. Gösterilmemiş adımlar tahmin edilmez; bilinmeyen her şey
`BİLİNMİYOR` olarak işaretlenir ve kullanıcı gösterdikçe doldurulur.

## Durum

- Kayıt durumu: **Eksik** — kullanıcı adım adım gösterimi henüz yapmadı.
- Otomasyon durumu: **Kurulmadı** — iş akışı tamamlanınca kurulacak.

## Bilinen adımlar (kullanıcının aktardığı)

| # | Ekran | Eylem | Beklenen sonuç | Kaynak |
|---|-------|-------|----------------|--------|
| 1 | Raunt ana ekranı (oturum açık) | Üstteki **OKULUMDAN** menüsünün üzerine gel (hover) | **ÖDEVLER** alt menüsü açılır | Kullanıcı |
| 2 | OKULUMDAN alt menüsü | **ÖDEVLER**'e tıkla | Ödevler sayfası açılır | Kullanıcı (sayfa görünümü gösterilmedi) |
| 3 | Ödevler sayfası | **Aktif Ödevler** filtresini kullan | Yalnızca aktif ödevler listelenir | Kullanıcı (filtrenin yeri/türü gösterilmedi) |
| 4 | Ödev içi | — | Ödevin içinde **süreli testler** olabilir | Kullanıcı |

## Bilinmeyenler (gösterilmesi gerekenler)

- Raunt adresi (URL) ve oturum açma ekranı / oturumun nasıl korunduğu.
- Ödevler sayfasının görünümü; Aktif Ödevler filtresinin yeri ve türü (sekme, açılır liste, onay kutusu…).
- Ödev listesinde bir ödevin nasıl açıldığı (tıklanan öğe, buton adı).
- Ödev içi yapı: soru tipleri (çoktan seçmeli, boşluk doldurma, açık uçlu…), sayfalama, yanıtın nasıl girildiği.
- Süreli test: başlatma butonu, başlamadan önce süre/soru sayısı görünüyor mu, sorular başlatmadan görülebiliyor mu, süre bitince ne oluyor.
- Ödevi/testi tamamlama: buton adı, onay penceresi, tamamlandığını gösteren ekran veya durum etiketi.
- Teslim durumunun doğrulanabileceği yer (liste etiketi, puan, "Tamamlandı" ibaresi vb.).

## Kurallar (kullanıcının belirlediği)

- Rutin adımlarda kullanıcıya soru sorulmaz.
- Şifre istenmez. Oturum kapanırsa, sayfa açılmazsa veya işlem engellenirse somut engel raporlanır.
- Tamamlanmamış ödev "tamamlandı" diye raporlanmaz; teslim durumu ekranda doğrulanır.
- Süreli test yalnızca sorular görülüp süre içinde bitirilebileceğinden emin olunduğunda başlatılır.
- Çalışma zamanı: her gün 17.00 (Europe/Istanbul) — iş akışı tamamlandıktan sonra.

## Rapor biçimi (her ödev için)

- Ödev adı / ders / son tarih
- Soru sayısı, her soru için kısa çözüm yolu ve girilen yanıt
- Süreli test varsa: başlatıldı mı, neden
- Teslim durumu: ekranda doğrulanan durum (Tamamlandı / Tamamlanmadı + somut neden)

## Gösterim kayıtları

_Kullanıcı adımları gösterdikçe buraya tarih sırasıyla eklenecek._
