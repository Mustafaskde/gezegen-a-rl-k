# ORM · Oralsan Makina Takım: marka filmi

Kodla çizilmiş, 42 saniyelik yatay (1920 × 1080, 60 fps) bir marka filmi. Bir çelik çubuk taşlanır, ısıl işlem görür, ölçülür; takım ailesine dönüşür, Kırşehir'deki üretimle bir makine parçasında birleşir ve ORM kartında biter. Son kare ilk kareye bağlanır, yani film döngü olarak da oynar.

Stil: **Çelik**. Antrasit zemin, ince teknik resim ızgarası, tek vurgu rengi olarak ısıl işlem turuncusu (#FF6A1A). Yazılar Inter Display, etiketler DejaVu Sans Mono.

## Vuruş haritası (120 BPM; vuruş n = (n − 1) × 0,5 sn)

| Sahne | Zaman | Vuruş | Ne olur |
|---|---|---|---|
| Kanca | 0–6 sn | 1–12 | Çelik çubuk; "Bir çubuk çelik." (1,0) / "Henüz hiçbir şey." (3,0) |
| Taşlama | 6–11 sn | 13–22 | Taşlama diski iner (6,0), sağdan sola helis kanallar ve uç (6,5–9,0); "Taşlama ile **biçim** bulur."; 118° |
| Isıl işlem | 11–16 sn | 23–32 | Robot kol matkabı fırına taşır; kızıl → turuncu → soğuma; sıcaklık eğrisi; "Isıyla **sertleşir**." |
| Kalite | 16–21 sn | 33–42 | Ø 10,00 ✓ (17,0), L 133 ✓ (18,0), dönüş, SALGI ✓ (19,5); "Her ölçü **kontrol** edilir." |
| Aile | 21–29 sn | 43–58 | Matkap 22,0 · Kılavuz 23,5 · Freze 25,0 · Rayba 26,5 · Torna ucu 28,0; "Her iş için bir **takım**." |
| Doruk | 29–34 sn | 59–68 | Flanş çizilir; **30,0'da doruk** (müziğin dorukla aynı vuruşu); "Kırşehir'de **üretilir**." 98.000 m² |
| Kapanış | 34–42 sn | 69–84 | Delikten iris açılır: ORM, ORALSAN MAKİNA TAKIM, "Metale **yön** veren.", orm-tr.com · 0212 243 27 05; 40,4'te iris kapanır, çubuk |

## Önizle, kontrol et, render al

Bu ortamda Chromium için `--no-sandbox` sarmalayıcısı `CHROME=` ile verilmelidir (root kullanıcısı).

```bash
S=../../.claude/skills/motion-designer/scripts
# önizleme: src/index.html dosyasını Chrome'da aç (stil denemesi: ?style=blueprint | paper)
node $S/check.mjs src/index.html
python3 audio/make_track.py audio/edit.wav            # müziği yeniden üret
node $S/render.mjs cues src/index.html audio/cues.json
python3 $S/sfx.py audio/cues.json --key "D minor" --music audio/edit.wav --music-gain 0.55 --out audio/mix
node $S/render.mjs video src/index.html out/orm.mp4 --audio audio/mix.m4a --scale 2
python3 $S/build_single.py src/index.html dist/orm.html
```

## Kaynaklar ve haklar

- **Bilgiler** ([orm-tr.com](https://orm-tr.com/) arama sonuçlarından; site bu ortamdan açılamadı):
  - ürün grupları (matkap, kılavuz, freze, rayba, torna uçları, karbür)
  - Kırşehir fabrikası, 98.000 m²
  - kalite laboratuvarı ve robotlu ısıl işlem tesisi
  - HSS ve karbür hammadde
  - telefon 0212 243 27 05
- **Örnek ölçüler:** Ø 10,00 ve L 133 temsilîdir, belirli bir ürünün katalog değeri değildir.
- **Logo:** Gerçek ORM logosu kullanılmadı. "ORM" yazısı Inter Display ile dizildi. Logo dosyası gelirse kapanış kartına konacak.
- **Müzik:** Bu film için `audio/make_track.py` ile numpy'de sentezlenen özgün bir parça. Örnek veya indirilmiş ses yok. Efektler `sfx.py` ile sentezlendi. Kredi gerekmez.
- **Fontlar:**
  - Inter Display (SIL Open Font License)
  - DejaVu Sans Mono (Bitstream Vera / public domain türevi lisans)
