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

13. (2026-10-08) İlk dersten önce **teorik temel bilgiler ve basit testler**; ardından sol anahtarında **tek oktavda
    notalar kademeli**: önce yalnızca Do ve Sol, sonra iki nota daha, sonra iki daha.

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

| Tarih      | Ne                                                                                                                                                                                               | Nerede                          |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------- |
| 2026-10-07 | Repo boştu; README ve yol haritası eklendi                                                                                                                                                       | `main`                          |
| 2026-10-07 | Faz 0 + 1: iskelet, CI, Pages yayını, MIDI, ses, porte, Nota Avcısı, sonuç ekranı                                                                                                                | PR #1, dal `faz-1-cekirdek`     |
| 2026-10-07 | Faz 2: XP, seri, kalpler, günlük hedef, rozetler, ders haritası, profil, zayıf notalar                                                                                                           | PR #2, dal `faz-2-oyunlastirma` |
| 2026-10-07 | Faz 3: maskot Notiş, ders içi tepkiler ve seri, ses efektleri, konfeti, seviye atlama ekranı                                                                                                     | PR #3, dal `faz-3-karakterler`  |
| 2026-10-07 | Faz 4: PixiJS mini oyun motoru, beceri sağlayıcısı, Nota Kuşu ve Balon Patlatma                                                                                                                  | PR #4, dal `faz-4-mini-oyunlar` |
| 2026-10-07 | Faz 5: metronom, zamanlama değerlendirmesi, gecikme kalibrasyonu, 5 ritim egzersizi, Dino Koşusu, Ritim Davulcusu, zamanlama raporu                                                              | PR #5, dal `faz-5-ritim-5xfbrn` |
| 2026-10-07 | PR #1–#4 sırayla `main`'e birleştirildi (doküman çakışmaları `main` sürümüyle çözüldü)                                                                                                           | `main`                          |
| 2026-10-07 | PR #5 birleşti, GitHub Pages yayını açıldı                                                                                                                                                       | `main`                          |
| 2026-10-07 | Cila turu: 3/4, noktalı notalar (4 yeni ders), tempo hafızası, ritim XP etiketi, profilde ritim grafiği, iki klavyeye göre yardım                                                                | PR #6                           |
| 2026-10-07 | Faz 6: fa anahtarı ünitesi (10 ders), iki el ünitesi (7 ders), büyük porte, Orta Do köprüsü, melodi dersleri, Nota Barmeni, ellere göre rapor ve iki el uyumu, 3 yeni rozet                      | PR #7                           |
| 2026-10-07 | Faz 7: gamlar ünitesi (18 ders), doğru yazım ve donanım imi, parmak numaraları ve geçiş uyarıları, Gam Merdiveni, Melodi Hafızası, gam raporu (eşit tempo, geçişler, iki el uyumu), 3 yeni rozet | PR #9                           |
| 2026-10-07 | Faz 7 iyileştirmeleri: Tempo Merdiveni (kalıcı tempo artışı), iki oktavlık gamlar, Si, Mi♭, La♭ parmak düzenleri, Kulaktan Hafıza, 6 yeni ders, "Hız Treni" rozeti                               | PR #10                          |
| 2026-10-08 | Faz 8 ekleri: Akor Barmeni (Nota Barmeni akorlarla, tek ve iki el), Kulaktan Akor ve Kulaktan Yedililer (akor türünü kulakla bulma), 4 yeni ders                                                 | PR #12                          |
| 2026-10-07 | Faz 8: akorlar ünitesi (20 ders), akor algılama, çevrimler, yedili akorlar, ilerlemeler, arpejler, Akor Aşçısı, Uzay Savunması, Arpej Sörfü, akor raporu, 5 yeni rozet                           | PR #11                          |
| 2026-10-08 | Başlangıç ünitesi: 4 teori dersi ve testleri, notalar ikişer ikişer (tanıtım + odaklı alıştırma), 2 oyun, "İlk Oktav" rozeti                                                                     | PR #15                          |
| 2026-10-08 | Test modu (bütün dersler açık, her ekranda bağlamıyla not bırakma, notları kopyalama/paylaşma) ve cihazlar arası ilerleme kodu                                                                   | PR #13                          |
| 2026-10-08 | Test modu ekleri: not paneli oyunu duraklatır, nota ekran görüntüsü, "Dersi bitir" kısayolu, notları .zip olarak indirme                                                                         | PR #13                          |
| 2026-10-07 | Plan genişletildi: gamlar, mini oyun matrisi, 14 faz; devir belgeleri yazıldı                                                                                                                    | `main`                          |

- **Fa anahtarı ve iki el (Faz 6):** Büyük portede Orta Do ve üst portede yazılan notalar sağ el, alt portedekiler sol
  el sayılır; El raporu buna göre hesaplanır. Orta Do çevresi (La3–Mi4) bazı derslerde iki portede de çıkar ve nota
  istatistiği porte başına ayrı tutulur (alt portedeki Do4 ile üst portedeki Do4 ayrı ölçülür). İki tuşlu adımlar
  sırayla da basılabilir, ama eller arasındaki fark ölçülüp raporlanır (100 ms içi "aynı anda"). Barmen'de yanlış tuş
  can götürmez, bara ulaşan müşteri götürür (Balon gibi).

- **Gamlar (Faz 7):** Gamlar bir oktav çıkıp iner (15 nota). Sağ el 4. oktavdan, sol el bir ya da iki oktav aşağıdan
  başlar; zıt harekette iki başparmak Orta Do'ya en yakın tonikte buluşur. Parmak numaraları standart (Fa ve Si♭
  majörde özel), geçiş: parmak numarası perdeyle aynı yönde ilerlemediğinde (1'e geçiş = başparmak altından). Gam ve
  hafıza dersleri nota okuma istatistiğine girmez (notalar önceden bilinir). Serbest tempolu gam derslerinde "eşit
  tempo" notalar arası sürenin ne kadar sabit olduğudur; Gam Merdiveni'nde zamanlama metronoma göre ölçülür. Melodi
  Hafızası'nda yanlış tuş can götürür, doğru tuş gösterilir ve dizi kaldığı yerden sürer.

- **Faz 7 iyileştirmeleri:** Serhan Faz 7'den sonra raporun önerilerini istedi ("faz 7 ve 8'i sırayla ayrı
  thread'lerde çöz"). Tempo merdiveninde tur geçme eşiği zamanlama puanı %80 (Mükemmel 1, İyi 0,85, Erken/Geç 0,4);
  kalpler turlar boyunca taşınır. Kalıcı artış yalnızca bütün turlar geçilince olur, böylece bir şanslı tur tempoyu
  yükseltmez. Gam Merdiveni (merdiven oyunu) bir oktavda kaldı: iki oktav serbest tempolu gam derslerinde. Kulaktan
  Hafıza'da diziler toniğe başlar ve ilk nota gösterilir, çünkü mutlak kulak olmadan ilk notayı duyarak bulmak
  beklenemez.

- **Akorlar (Faz 8):** Bir akor, tutulan ya da son 350 ms içinde basılan tuşlardan oluşur; bütün notalar inince
  değerlendirilir. Notalar tek tek basılsa da doğru sayılır, ama "aynı anda" (ilk ve son nota arası 100 ms içi) oranı
  ayrı raporlanır, çünkü akor çalmayı öğrenen biri önce notaları bulmalı. Üç eşleşme biçimi: portede okunan akorlar
  tam tuşuyla (`exact`), çevrim isteyen oyunlar oktav serbest ama en alttaki nota doğru olmalı (`voicing`), yalnızca
  adı verilen tarifler herhangi bir çevrimde (`pcs`). Derslerde yanlış tuş ve yanlış çevrim can götürür, oyunlarda
  götürmez (inen istilacı, yanan yemek götürür); yarım bırakılan akor can götürmez ama ilk deneme sayılmaz.
  İlerlemelerde her akor bir öncekine en az hareketle (her nota en yakın notaya uzaklık toplamı) ulaşan çevrimde
  yazılır: Do'da I–IV–V–I = Do-Mi-Sol, Do-Fa-La, Si-Re-Sol, Do-Mi-Sol. Arpej Sörfü 3/4'te: bir oktav 6 vuruş ve
  tutulan son nota (3 vuruş) = 3 ölçü.
- **Faz 8 ekleri:** Serhan Faz 8 raporundaki 2. ve 3. öneriyi istedi ("2. ve 3. maddeleri tamamlayıp kapatabiliriz";
  Clavinova testi sonraya kaldı). Kulaktan akorda kök nota yanar, çünkü yalnızca türü (majör, minör, yedili) duymak
  isteniyor, mutlak ses değil; akor oktav serbest ama kök en altta çalınır (`voicing`). Ses yüklenemezse akorun adı
  yazılır, ders yine oynanır.
- **Test modu:** Serhan her yeni cihazda baştan başlamadan test edip düzeltme önermek istedi. Test modu ayarlardan
  açılır: bütün dersler açılır ve her ekranın sağında 📝 düğmesi çıkar. Not, panel açıldığı anki ekranı, dersi, ünite
  ve ders türünü, sonuç ekranında doğruluk ve yıldızı, MIDI klavyeyi, ekran boyutunu ve uygulama sürümünü (commit +
  tarih) kendiliğinden yazar; notlar cihazda kalır ve tek dokunuşla Markdown olarak kopyalanır ya da paylaşılır, böylece
  sohbete yapıştırılabilir. İlerlemeyi taşımak için ayarlarda "İlerlemeyi taşı" herkese açık: bir cihazda "Kodu al",
  ötekinde yapıştır (ya da dosya); yüklemeden önce onay sorulur, çünkü o cihazdaki ilerlemenin yerine geçer.
- **Test modu ekleri:** Serhan rapordaki ilk üç öneriyi istedi ("ilk 3 önerini uygulayabiliriz"). 📝 açılınca oyun
  durur (bütün oyunlar ortak bir oyun saatiyle çalışır, metronom da durur, panel açıkken basılan tuşlar sayılmaz).
  Not açıldığı anda ekranın görüntüsü alınır, istenirse nottan çıkarılır; görüntüler cihazda ayrı bir veritabanında
  durur, "İndir" notlar ve görüntülerle bir .zip verir, telefonda "Paylaş" dosyaları gönderir. "Dersi bitir" (⏭)
  dersi o ana kadar çalınanla bitirir ve sonuç ekranını gösterir; bu sonuç XP'ye, yıldızlara ve istatistiklere
  yazılmaz, çünkü yarım bir ders gerçek ilerlemeyi bozmamalı.

- **Başlangıç ünitesi:** Sıra Do-Sol (Do pozisyonunda 1. ve 5. parmak), Re-Mi, Fa-La, Si-Do5. Testlerde can yok; ilk
  cevap sayılır, yanlışta açıklama gösterilip yeniden denenir. Seçenekler her seferinde karışık sırada. Ünite 1 kilitli
  değil (mevcut ilerleme bozulmasın); harita "BAŞLA" ile yeni kullanıcıyı Başlangıç'a yönlendirir.

## Açık konular

- **Gerçek MIDI testi yapılmadı.** Uygulama tarayıcıda ekran klavyesiyle uçtan uca denendi; gerçek bir Bluetooth/USB
  klavyeyle ilk deneme sahibinde.
- **Klavye port adları** (`src/midi/keyboards.ts`) tahmin; sahip klavyeleri bağlayınca görünen adlarla doğrulanmalı.
