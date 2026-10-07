# Proje Geçmişi ve Kararlar

Bu belge, projenin başladığı sohbetin özetidir. Yeni bir oturum (Claude Code ya da başka bir geliştirici) buradan
okuyarak kaldığı yerden devam edebilir. Teknik ayrıntılar için [CLAUDE.md](../CLAUDE.md), yol haritası için
[PLAN.md](PLAN.md).

## Proje sahibinin istekleri (Serhan, GitHub: `serhanco`)

Özgün proje tanımı:

> Öncelikle mobil cihazlarda (tablet, telefon, mümkünse bilgisayarlar da) kullanılabilecek, oyunlaştırma özelliklerini,
> Duolingo tarzı bir ilerleme ve gelişim sürecini takip edebileceğimiz imkanlar sunan, Bluetooth MIDI üzerinden haberleşme
> imkanı sunarak, eğlenceli oyunlaştırma fonksiyonları eşliğinde kullanıcıya piyano çalmayı, geliştirmeyi öğreten bir
> uygulama. Önce sol anahtarı, sonra fa anahtarını ve ilerleyince ikisini birden eş zamanlı içerecek şekilde; nota
> öğrenme, doğru notaya basma, tempo ve ritim ile birlikte parmakların doğru zamanlama geliştirmesi, akor basma, akor
> çevrimleri, arpej gibi konularda ilerleme sağlayacak.

Sohbet boyunca eklenen istekler (2026-10-07):

1. **Sıfırdan** başlanıyor. Teknoloji tercihi yok, ama ürün olabildiğince **global**, her cihazı kapsayan ve
   **hız/performans** açısından verimli olmalı.
2. İlk hedef: **kendi öğrenmesi için bir prototip**.
3. Duolingo gibi **muhteşem karakterlerle desteklenmiş sevimli animasyonlar** istiyor.
4. Hazır UI kit, framework, kütüphane kullanmakta sakınca yok.
5. **Her aktivitenin sonunda** kullanıcıya **hangi konuda ve hangi oranda** başarılı olduğu söylenmeli.
6. Plan **ayrıntılı ve fazlara ayrılmış** olmalı. Gerekirse skill, connector, MCP, bilgisayar erişimi kullanılabilir.
7. Plan sonrası çalışma **otomatik pilotta**, faz faz ilerlemeli.
8. **Gamlar** plana eklenmeli: sol anahtarı, fa anahtarı ve **iki el eş zamanlı**.
9. Oyunlaştırma **daha yaratıcı ve çeşitli** olmalı: Flappy Bird benzeri, eski "bartender" (Tapper) benzeri, Chrome
   çevrimdışı Dino benzeri oyunlar gibi; bunlar çoğaltılıp ayrı fazlara bölünebilir.
10. Tüm bu bağlam, yeni bir Claude Code oturumu açıldığında **kusursuz şekilde ve iyileştirmelerle** devam edilebilecek
    hale getirilmeli (bu belge ve `CLAUDE.md` bunun için var).
11. (Faz 5 sırasında) Her faz bitince **durulacak**: plan ile uygulama karşılaştırılıp test edilecek, durum ve
    öneriler paylaşılacak, sahibin komutuyla bir sonraki faza geçilecek.
12. (Faz 5 sonrası) Klavyeler: **evde Yamaha CLP-845, ofiste Akai MPK Mini MK3**. Bekleyen cila işleri tamamlanıp Faz 6
    için iş planı üzerinden devam edilecek.

## Verilen kararlar

- **Platform:** React + TypeScript PWA. Tek kod tabanı telefonda, tablette ve bilgisayarda çalışır. iOS'ta Safari Web MIDI
  desteklemediği için iOS MIDI, Capacitor ile yerel sarmalayıcıda gelecek (Faz 13).
- **Kütüphaneler:** VexFlow 5 (porte), Tone.js (ses, ileride metronom), Zustand (durum), Dexie (IndexedDB), Mini oyunlar
  için PixiJS 8 planlandı.
- **Dil:** Uygulama metinleri Türkçe (Do Re Mi solfej adlarıyla), kod ve yorumlar İngilizce.
- **MIDI sesi:** Dijital piyano kendi sesini çıkardığı için MIDI girişinde uygulama sesi varsayılan olarak kapalı;
  ayarlardan açılabilir. Ekran ve bilgisayar klavyesinde ses açık.
- **Sonuç raporu:** İlk denemede doğru oranı, ortalama tepki süresi, konu bazında başarı (çizgi / ara / porte dışı
  notalar), en zayıf notalar ve en çok neyle karıştırıldıkları.
- **Çeşitlilik mimarisi:** Mini oyunlar "beceri sağlayıcısı" ile beslenecek; aynı oyun farklı becerilerle (sol/fa
  anahtarı, gam, akor) oynanabilecek. Ayrıntı: PLAN.md → "Oyun ve beceri matrisi".
- **İş akışı:** Her faz ayrı PR. Önceki PR birleştirilmediyse yeni dal onun üzerine kurulur. Faz sonunda durulur,
  rapor verilir, onayla devam edilir.
- **Klavyeler:** CLP-845'te USB TO HOST ve Bluetooth ses + MIDI var (Yamaha'ya göre bazı ülkelerde Bluetooth yok); en
  sağlam yol USB. Android'de Bluetooth ayarlarından eşleştirmek yalnızca ses bağlar, MIDI için ayrı uygulama gerekir.
  Akai MPK Mini MK3 yalnızca USB, sürücüsüz, kendi sesi yok: uygulama ona her zaman piyano sesi çalar. Gecikme her
  klavye için ayrı ölçülür.
- **Ritim (Faz 5):** Oyunların saati `performance.now()`; metronom yalnızca ses ve Tone.Transport ile aynı vuruşlara
  hizalanır. Gecikme giriş kaynağına göre (MIDI, ekran, bilgisayar klavyesi) ayrı ölçülüp çıkarılır. Ritim ünitesinin
  ilk dersi baştan açık (nota okuma gerektirmiyor). Yanlış tuş can götürmez, kaçırılan vuruş götürür.

## Yapılanlar

| Tarih      | Ne                                                                                                                                                                          | Nerede                          |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| 2026-10-07 | Repo boştu; README ve yol haritası eklendi                                                                                                                                  | `main`                          |
| 2026-10-07 | Faz 0 + 1: iskelet, CI, Pages yayını, MIDI, ses, porte, Nota Avcısı, sonuç ekranı                                                                                           | PR #1, dal `faz-1-cekirdek`     |
| 2026-10-07 | Faz 2: XP, seri, kalpler, günlük hedef, rozetler, ders haritası, profil, zayıf notalar                                                                                      | PR #2, dal `faz-2-oyunlastirma` |
| 2026-10-07 | Faz 3: maskot Notiş, ders içi tepkiler ve seri, ses efektleri, konfeti, seviye atlama ekranı                                                                                | PR #3, dal `faz-3-karakterler`  |
| 2026-10-07 | Faz 4: PixiJS mini oyun motoru, beceri sağlayıcısı, Nota Kuşu ve Balon Patlatma                                                                                             | PR #4, dal `faz-4-mini-oyunlar` |
| 2026-10-07 | Faz 5: metronom, zamanlama değerlendirmesi, gecikme kalibrasyonu, 5 ritim egzersizi, Dino Koşusu, Ritim Davulcusu, zamanlama raporu                                         | PR #5, dal `faz-5-ritim-5xfbrn` |
| 2026-10-07 | PR #1–#4 sırayla `main`'e birleştirildi (doküman çakışmaları `main` sürümüyle çözüldü)                                                                                      | `main`                          |
| 2026-10-07 | PR #5 birleşti, GitHub Pages yayını açıldı                                                                                                                                  | `main`                          |
| 2026-10-07 | Cila turu: 3/4, noktalı notalar (4 yeni ders), tempo hafızası, ritim XP etiketi, profilde ritim grafiği, iki klavyeye göre yardım                                           | PR #6                           |
| 2026-10-07 | Faz 6: fa anahtarı ünitesi (10 ders), iki el ünitesi (7 ders), büyük porte, Orta Do köprüsü, melodi dersleri, Nota Barmeni, ellere göre rapor ve iki el uyumu, 3 yeni rozet | PR #7                           |
| 2026-10-07 | Plan genişletildi: gamlar, mini oyun matrisi, 14 faz; devir belgeleri yazıldı                                                                                               | `main`                          |

- **Fa anahtarı ve iki el (Faz 6):** Büyük portede Orta Do ve üst portede yazılan notalar sağ el, alt portedekiler sol
  el sayılır; El raporu buna göre hesaplanır. Orta Do çevresi (La3–Mi4) bazı derslerde iki portede de çıkar ve nota
  istatistiği porte başına ayrı tutulur (alt portedeki Do4 ile üst portedeki Do4 ayrı ölçülür). İki tuşlu adımlar
  sırayla da basılabilir, ama eller arasındaki fark ölçülüp raporlanır (100 ms içi "aynı anda"). Barmen'de yanlış tuş
  can götürmez, bara ulaşan müşteri götürür (Balon gibi).

## Açık konular

- **Gerçek MIDI testi yapılmadı.** Uygulama tarayıcıda ekran klavyesiyle uçtan uca denendi; gerçek bir Bluetooth/USB
  klavyeyle ilk deneme sahibinde.
- **Klavye port adları** (`src/midi/keyboards.ts`) tahmin; sahip klavyeleri bağlayınca görünen adlarla doğrulanmalı.
