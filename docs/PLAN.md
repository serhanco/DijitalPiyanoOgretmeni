# Dijital Piyano Öğretmeni — Yol Haritası

Duolingo tarzı ilerleme, sevimli karakterler ve Bluetooth/USB MIDI ile çalışan,
piyano çalmayı adım adım öğreten bir uygulama. İlk hedef: kişisel kullanım için
çalışan bir prototip.

## Teknoloji kararları

| Konu        | Seçim                                                  | Neden                                                                 |
| ----------- | ------------------------------------------------------ | --------------------------------------------------------------------- |
| Uygulama    | React 19 + TypeScript + Vite                           | Hızlı, tek kod tabanı, geniş ekosistem                                |
| Dağıtım     | PWA (kurulabilir web uygulaması), sonra Capacitor      | Telefon, tablet, bilgisayar; sonra mağazalar                          |
| MIDI        | Web MIDI API (USB + Bluetooth MIDI)                    | Chrome/Edge/Android'de yerleşik, kurulum yok                          |
| iOS MIDI    | Capacitor + yerel CoreMIDI eklentisi (Faz 8)           | Safari Web MIDI desteklemiyor                                         |
| Nota çizimi | VexFlow 5                                              | Standart, SVG çıktısı, hızlı                                          |
| Ses         | Tone.js + Salamander piyano örnekleri                  | Gerçekçi ses, hassas zamanlama (metronom)                             |
| Durum       | Zustand                                                | Küçük, hızlı, basit                                                   |
| Kalıcı veri | IndexedDB (Dexie)                                      | Çevrimdışı ilerleme, istatistikler                                    |
| Animasyon   | Motion (Framer Motion) + SVG karakterler, ileride Rive | Akıcı, hafif                                                          |
| Test        | Vitest + Testing Library                               | Hızlı birim testleri                                                  |
| CI / yayın  | GitHub Actions + GitHub Pages                          | Her değişiklik bir HTTPS adresinde denenebilir (Web MIDI HTTPS ister) |

**Cihaz notu:** Prototip Android tablet/telefonda Chrome ile ve bilgisayarda
Chrome/Edge ile MIDI'ye bağlanır. iPhone/iPad'de MIDI, Faz 8'deki yerel
sarmalayıcıyla gelir; o zamana kadar orada ekran klavyesi çalışır.

## Fazlar

Her faz ayrı bir PR olarak gelir ve sonunda denenebilir bir uygulama bırakır.

### Faz 0 — Altyapı

- Vite + React + TS iskeleti, ESLint, Prettier, Vitest
- GitHub Actions: lint, test, build
- GitHub Pages'e otomatik yayın (her birleşmede canlı adres)
- PWA manifest ve service worker (çevrimdışı çalışma, ana ekrana ekleme)

### Faz 1 — Çekirdek: MIDI, ses, porte, ilk oyun

- **MIDI katmanı:** cihaz listesi, otomatik bağlanma, note-on/off, velocity,
  bağlantı kopunca yeniden bağlanma
- **Yedek girişler:** dokunmatik ekran klavyesi ve bilgisayar klavyesi (A S D F…)
- **Ses:** basılan tuşu piyano sesiyle çalma
- **Porte:** sol anahtarda tek nota çizimi (VexFlow)
- **Oyun 1 — Nota Avcısı (sol anahtar):** nota çıkar, doğru tuşa bas.
  Seviyeler: Do4–Sol4 → Do4–Do5 → Do4–Sol5 (ek çizgiler dahil)
- **Sonuç ekranı v1:** doğruluk yüzdesi, ortalama tepki süresi,
  en çok karıştırılan notalar

### Faz 2 — Oyunlaştırma ve ilerleme

- XP, seviye, günlük seri (streak), can (kalp) sistemi, günlük hedef
- Duolingo tarzı **ders haritası**: üniteler → dersler → kilit açma
- Rozetler/başarımlar (ilk mükemmel ders, 7 günlük seri…)
- IndexedDB'de kalıcı ilerleme ve nota bazında istatistik
- **Ayrıntılı sonuç ekranı:** konu bazında başarı (ör. "ek çizgi notaları %62"),
  geçmiş derslerle karşılaştırma, zayıf noktalar için öneri

### Faz 3 — Ritim, tempo, zamanlama

- Metronom (Tone.Transport), tempo ayarı, ölçü göstergesi
- Zamanlama değerlendirmesi: Mükemmel (±40 ms), İyi (±90 ms), Geç/Erken, Kaçırıldı
- **Gecikme kalibrasyonu** (Bluetooth MIDI gecikmesini telafi etmek için)
- Ritim egzersizleri: dörtlük, ikilik, sekizlik, es
- Kayan porte ile kısa melodiler çalma (sol anahtar)
- Sonuç ekranı: zamanlama dağılımı grafiği, ortalama erken/geç sapma

### Faz 4 — Fa anahtarı ve iki el

- Fa anahtarı nota okuma (Faz 1 oyunlarının fa sürümü)
- Büyük porte (sol + fa), orta Do çevresi geçişleri
- Sol el melodileri, ardından basit iki el koordinasyonu (sol el tek nota + sağ el melodi)
- El bazında rapor (sağ el / sol el doğruluk ve zamanlama)

### Faz 5 — Akorlar, çevrimler, arpejler

- Akor algılama (aynı anda basılan notaları pencere içinde gruplama)
- Majör/minör üçlüler, sonra 7'li akorlar
- Akor çevrimleri (kök, 1. çevrim, 2. çevrim) ve çevrim geçiş egzersizleri
- Arpejler (sıra, eşitlik ve tempo değerlendirmesi)
- Gamlar ve parmak numarası ipuçları
- Akor ilerlemeleri (I–IV–V–I, I–V–vi–IV)

### Faz 6 — Karakterler ve animasyon

- Maskot karakter (SVG + Motion): sevinme, üzülme, cesaretlendirme halleri
- Ders sonu kutlaması (konfeti, seri alevi, XP sayacı)
- Ses efektleri ve dokunmatik titreşim
- İsteğe bağlı: Rive ile daha zengin karakter animasyonları

### Faz 7 — Akıllı öğrenme

- Aralıklı tekrar: zayıf notalar/akorlar daha sık gelir
- Uyarlanabilir zorluk (başarıya göre hız ve nota aralığı)
- Günlük "alıştırma karışımı" dersi
- Haftalık ilerleme özeti

### Faz 8 — Platformlar ve yayın

- Capacitor ile iOS ve Android uygulaması
- iOS için yerel CoreMIDI/Bluetooth MIDI eklentisi
- İsteğe bağlı bulut yedekleme ve cihazlar arası senkron
- Mağaza hazırlıkları (simgeler, ekran görüntüleri)

## Çalışma şekli

- Her faz bir PR; CI yeşil olduğunda incelemeye hazır.
- PR birleştirilmeden yeni faza geçilirse yeni PR bir öncekinin üzerine kurulur.
- Uygulama metinleri Türkçe; kod ve yorumlar İngilizce.
