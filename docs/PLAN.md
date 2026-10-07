# Dijital Piyano Öğretmeni — Yol Haritası

Duolingo tarzı ilerleme, sevimli karakterler, bol çeşitli mini oyunlar ve Bluetooth/USB MIDI ile çalışan, piyano
çalmayı adım adım öğreten bir uygulama. İlk hedef: kişisel kullanım için çalışan bir prototip.

Öğrenme sırası: önce sol anahtarı, sonra fa anahtarı, sonra ikisi birden. Konular: nota okuma, doğru tuşa basma, tempo
ve ritim, parmak zamanlaması, gamlar, akorlar, akor çevrimleri, arpejler.

## Durum

| Faz                        | Durum                                                |
| -------------------------- | ---------------------------------------------------- |
| 0 Altyapı                  | PR #1 (`faz-1-cekirdek`)                             |
| 1 Çekirdek ve Nota Avcısı  | PR #1 (`faz-1-cekirdek`)                             |
| 2 Oyunlaştırma ve ilerleme | Yarım: `faz-2-oyunlastirma` dalı (henüz derlenmiyor) |
| 3 ve sonrası               | Başlanmadı                                           |

Güncel ayrıntılar ve bir sonraki adım için: [CLAUDE.md](../CLAUDE.md) ve [docs/GECMIS.md](GECMIS.md).

## Teknoloji kararları

| Konu         | Seçim                                                  | Neden                                                   |
| ------------ | ------------------------------------------------------ | ------------------------------------------------------- |
| Uygulama     | React 19 + TypeScript + Vite                           | Hızlı, tek kod tabanı, geniş ekosistem                  |
| Dağıtım      | PWA (kurulabilir web uygulaması), sonra Capacitor      | Telefon, tablet, bilgisayar; sonra mağazalar            |
| MIDI         | Web MIDI API (USB + Bluetooth MIDI)                    | Chrome/Edge/Android'de yerleşik, kurulum yok            |
| iOS MIDI     | Capacitor + yerel CoreMIDI eklentisi (Faz 13)          | Safari Web MIDI desteklemiyor                           |
| Nota çizimi  | VexFlow 5 (`vexflow/bravura`)                          | Standart, SVG çıktısı, hızlı                            |
| Ses          | Tone.js + Salamander piyano örnekleri                  | Gerçekçi ses, hassas zamanlama (metronom)               |
| Durum        | Zustand                                                | Küçük, hızlı, basit                                     |
| Kalıcı veri  | IndexedDB (Dexie)                                      | Çevrimdışı ilerleme, istatistikler                      |
| Animasyon    | Motion (Framer Motion) + SVG karakterler, ileride Rive | Akıcı, hafif                                            |
| Mini oyunlar | PixiJS 8 (WebGL / Canvas sprite motoru)                | 60 fps, mobilde hızlı, React'ten bağımsız oyun döngüsü  |
| Test         | Vitest + Testing Library, Playwright ile uçtan uca     | Hızlı birim testleri, gerçek tarayıcıda deneme          |
| CI / yayın   | GitHub Actions + GitHub Pages                          | Her değişiklik HTTPS adresinde denenebilir (MIDI ister) |

**Cihaz notu:** Prototip Android tablet/telefonda Chrome ile ve bilgisayarda Chrome/Edge ile MIDI'ye bağlanır.
iPhone/iPad'de MIDI, Faz 13'teki yerel sarmalayıcıyla gelir; o zamana kadar orada ekran klavyesi çalışır.

## Oyun ve beceri matrisi

Çeşitliliğin anahtarı: her mini oyun bir **beceri sağlayıcısı** ile beslenir. Beceri sağlayıcısı "sıradaki hedef nedir
ve doğru cevap hangi tuş(lar)dır" sorusunu yanıtlar (tek nota, akor, gam adımı, ritim vuruşu…). Böylece aynı oyun sol
anahtarı, fa anahtarı, gamlar ya da akorlarla oynanabilir; her yeni oyun tüm ünitelere çeşit katar.

| Mini oyun (çalışma adı) | Esin kaynağı            | Mekanik                                                                                   | Ana beceri                         |
| ----------------------- | ----------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------- |
| Nota Avcısı             | Duolingo alıştırması    | Portede nota çıkar, doğru tuşa bas                                                        | Nota okuma (var)                   |
| Nota Kuşu               | Flappy Bird             | Borulardaki boşluk bir porte konumunda; o notayı çalınca kuş o yüksekliğe uçar            | Porte konumu ↔ tuş, hızlı okuma    |
| Nota Barmeni            | Tapper (eski bar oyunu) | Her tezgah bir nota/akor; müşteriler kayarak gelir, doğru tuşla içeceği gönder            | Hızlı tanıma, iki anahtar, akorlar |
| Dino Koşusu             | Chrome çevrimdışı Dino  | Karakter metronomla koşar; engeller vuruşa denk gelir, notayı vuruşunda çalınca zıplar    | Ritim, tempo, zamanlama            |
| Balon Patlatma          | Balon oyunları          | Notalı balonlar yükselir, çalınca patlar; kaçanlar can götürür                            | Okuma hızı                         |
| Gam Merdiveni           | Platform tırmanma       | Her doğru gam notası bir basamak; tempoya uyunca karakter tırmanır, parmak no. gösterilir | Gamlar, parmak geçişleri           |
| Uzay Savunması          | Space Invaders          | Üzerinde akor ya da nota olan istilacılar iner; çalınca ateş edilir                       | Akorlar, çevrimler                 |
| Arpej Sörfü             | Sörf / koşu oyunları    | Dalganın şekli bir arpej; notaları sırayla ve eşit aralıkla çal, sörfçü dalgada kalsın    | Arpejler, eşitlik                  |
| Nota Şelalesi           | Synthesia / Guitar Hero | Notalar yukarıdan klavyeye düşer, zamanında çal                                           | Şarkı çalma, iki el                |
| Ritim Davulcusu         | Ritim oyunları          | Şeritlerde vuruşlar gelir; Mükemmel / İyi / Kaçırıldı                                     | Ritim okuma                        |
| Melodi Hafızası         | Simon                   | Uygulama giderek uzayan bir dizi çalar, sen tekrarlarsın                                  | Hafıza, kulak                      |
| Kulak Dedektifi         | Bulmaca                 | Bir nota, aralık ya da akor duyulur, aynısını bul                                         | Kulak eğitimi                      |
| Akor Aşçısı             | Yemek oyunları          | Tarif bir akor (ör. Re minör); malzemeleri (notaları) aynı anda bas                       | Akor kurma                         |
| Ünite Boss'u            | Boss savaşları          | Ünite sonunda, ünitenin tüm becerilerini karıştıran zorlu bölüm                           | Tekrar ve pekiştirme               |

Oyun adları geçicidir; görseller ve isimler özgün olacak, esin alınan oyunların varlıkları kullanılmayacak.

## Fazlar

Her faz ayrı bir PR olarak gelir ve sonunda denenebilir bir uygulama bırakır.

### Faz 0 — Altyapı (PR #1)

- Vite + React + TS iskeleti, oxlint, Prettier, Vitest
- GitHub Actions: lint, biçim, test, build
- GitHub Pages'e otomatik yayın (repo ayarında Pages kaynağı "GitHub Actions" seçilmeli)
- PWA manifest ve service worker (çevrimdışı çalışma, ana ekrana ekleme)

### Faz 1 — Çekirdek: MIDI, ses, porte, ilk oyun (PR #1)

- MIDI katmanı: cihaz listesi, otomatik bağlanma, note-on/off, velocity, yeniden bağlanma
- Yedek girişler: dokunmatik ekran klavyesi ve bilgisayar klavyesi (A S D F…, Z/X oktav)
- Ses: Tone.js piyano (MIDI girişinde varsayılan kapalı, çünkü piyano kendi sesini çıkarır)
- Porte: sol anahtarda tek nota (VexFlow)
- Nota Avcısı: 5 ders (İlk Adımlar, Bir Oktav, Çizgiler, Aralar, Porte Ustası)
- Sonuç ekranı v1: doğruluk, tepki süresi, konu bazında başarı, karıştırılan notalar

### Faz 2 — Oyunlaştırma ve ilerleme (yarım)

- XP, seviye, günlük seri, can (kalp) sistemi, günlük hedef, "rahat mod" (kalpsiz)
- Duolingo tarzı ders haritası: üniteler → dersler → kilit açma
- Rozetler
- IndexedDB'de oturum geçmişi ve nota bazında birikimli istatistik
- Ayrıntılı sonuç ekranı: XP dökümü, seri, günlük hedef, yeni rozetler, önceki en iyiyle karşılaştırma
- "Zayıf Notalar" tekrar dersi (birikimli istatistikten en zayıf notalar)
- Profil ekranı: seviye, rozetler, son dersler, nota bazında başarı haritası

### Faz 3 — Karakterler ve animasyon

- Maskot karakter (SVG + Motion): sevinme, üzülme, cesaretlendirme, uyuma halleri; ders içinde tepki verir
- Ders sonu kutlaması (konfeti, seri alevi, XP sayacı), seviye atlama ve rozet animasyonları
- Ses efektleri ve dokunmatik titreşim
- İsteğe bağlı: Rive ile daha zengin karakter animasyonları

### Faz 4 — Mini oyun motoru ve ilk arcade oyunlar

- Ortak motor: PixiJS sahnesi, oyun döngüsü, beceri sağlayıcısı arayüzü, ortak skor ve sonuç ekranı entegrasyonu
- **Nota Kuşu** ve **Balon Patlatma** (sol anahtar notalarıyla)
- Ders haritasında ders türü çeşitliliği: alıştırma, mini oyun, boss

### Faz 5 — Ritim, tempo, zamanlama

- Metronom (Tone.Transport), tempo ayarı, ölçü göstergesi
- Zamanlama değerlendirmesi: Mükemmel (±40 ms), İyi (±90 ms), Erken/Geç, Kaçırıldı
- Gecikme kalibrasyonu (Bluetooth MIDI gecikmesini telafi etmek için)
- Ritim egzersizleri: dörtlük, ikilik, sekizlik, es
- **Dino Koşusu** ve **Ritim Davulcusu**
- Sonuç ekranı: zamanlama dağılımı grafiği, ortalama erken/geç sapma

### Faz 6 — Fa anahtarı ve iki el

- Fa anahtarında Nota Avcısı, Nota Kuşu, Balon Patlatma (beceri sağlayıcısı sayesinde)
- Büyük porte (sol + fa), orta Do çevresi geçişleri
- Sol el melodileri, ardından basit iki el koordinasyonu
- **Nota Barmeni**: üst tezgahlar sol anahtarı, alt tezgahlar fa anahtarı
- El bazında rapor (sağ el / sol el doğruluk ve zamanlama)

### Faz 7 — Gamlar (sol anahtarı, fa anahtarı, iki el eş zamanlı)

- Majör gamlar: Do, Sol, Re, La, Mi, Fa, Si♭…; sonra doğal, armonik ve melodik minör gamlar
- Sıra: sağ el (sol anahtarı) → sol el (fa anahtarı) → **iki el eş zamanlı** (paralel hareket) → zıt hareket
- Parmak numarası ipuçları ve başparmak geçişi uyarıları
- Değerlendirme: doğru nota sırası, tempoya uyum, iki el arasındaki senkron farkı (ms)
- **Gam Merdiveni** ve **Melodi Hafızası** (gam parçalarıyla)

### Faz 8 — Akorlar, çevrimler, arpejler

- Akor algılama (aynı anda basılan notaları pencere içinde gruplama)
- Majör/minör üçlüler, sonra 7'li akorlar; akor çevrimleri (kök, 1. çevrim, 2. çevrim)
- Akor ilerlemeleri (I–IV–V–I, I–V–vi–IV), çevrimlerle yumuşak geçişler
- Arpejler (sıra, eşitlik ve tempo değerlendirmesi), iki elle arpej
- **Uzay Savunması**, **Akor Aşçısı**, **Arpej Sörfü**

### Faz 9 — Kulak eğitimi ve hafıza

- Nota, aralık ve akor türü tanıma
- **Kulak Dedektifi** ve gelişmiş **Melodi Hafızası**

### Faz 10 — Şarkılar

- **Nota Şelalesi** ile tanıdık, telif sorunu olmayan melodiler (halk ezgileri, klasik temalar)
- Önce tek el, sonra iki el; yavaşlatma ve bölüm tekrarı

### Faz 11 — Ünite boss'ları ve etkinlikler

- Her ünitenin sonunda boss bölümü
- Haftalık meydan okumalar, günlük görevler ("bugün 3 mükemmel ders")

### Faz 12 — Akıllı öğrenme

- Aralıklı tekrar: zayıf notalar, akorlar ve gamlar daha sık gelir
- Uyarlanabilir zorluk (başarıya göre hız ve nota aralığı)
- Günlük "alıştırma karışımı" dersi, haftalık ilerleme özeti

### Faz 13 — Platformlar ve yayın

- Capacitor ile iOS ve Android uygulaması, iOS için yerel CoreMIDI/Bluetooth MIDI eklentisi
- İsteğe bağlı bulut yedekleme ve cihazlar arası senkron
- Mağaza hazırlıkları (simgeler, ekran görüntüleri)

## Çalışma şekli

- Her faz bir PR; CI yeşil olduğunda incelemeye hazır.
- PR birleştirilmeden yeni faza geçilirse yeni dal bir öncekinin üzerine kurulur.
- Uygulama metinleri Türkçe; kod ve yorumlar İngilizce.
