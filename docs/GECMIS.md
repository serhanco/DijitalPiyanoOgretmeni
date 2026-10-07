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
- **İş akışı:** Her faz ayrı PR. Önceki PR birleştirilmediyse yeni dal onun üzerine kurulur.

## Yapılanlar

| Tarih      | Ne                                                                                           | Nerede                          |
| ---------- | -------------------------------------------------------------------------------------------- | ------------------------------- |
| 2026-10-07 | Repo boştu; README ve yol haritası eklendi                                                   | `main`                          |
| 2026-10-07 | Faz 0 + 1: iskelet, CI, Pages yayını, MIDI, ses, porte, Nota Avcısı, sonuç ekranı            | PR #1, dal `faz-1-cekirdek`     |
| 2026-10-07 | Faz 2: XP, seri, kalpler, günlük hedef, rozetler, ders haritası, profil, zayıf notalar       | PR #2, dal `faz-2-oyunlastirma` |
| 2026-10-07 | Faz 3: maskot Notiş, ders içi tepkiler ve seri, ses efektleri, konfeti, seviye atlama ekranı | PR #3, dal `faz-3-karakterler`  |
| 2026-10-07 | Plan genişletildi: gamlar, mini oyun matrisi, 14 faz; devir belgeleri yazıldı                | `main`                          |

## Açık konular

- **GitHub Pages:** Repo ayarlarında Settings → Pages → Source: "GitHub Actions" seçilmeli; yoksa yayın iş akışı başarısız
  olur.
- **Gerçek MIDI testi yapılmadı.** Uygulama tarayıcıda ekran klavyesiyle uçtan uca denendi; gerçek bir Bluetooth/USB
  klavyeyle ilk deneme sahibinde.
- **Piyano modeli** henüz bilinmiyor (Bluetooth MIDI destekliyor mu, kaç tuş?). Öğrenilince bağlantı yardımı ona göre
  özelleştirilebilir.
