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
13. (Faz 8 sonrası) "Tek oktav bulunan derslerde tek oktav piyano göstermemiz yeterli olacaktır; çünkü ekrandaki tuşlar
    oldukça sıkışık."

14. (2026-10-08) İlk dersten önce **teorik temel bilgiler ve basit testler**; ardından sol anahtarında **tek oktavda
    notalar kademeli**: önce yalnızca Do ve Sol, sonra iki nota daha, sonra iki daha.
15. (2026-10-21, Faz 13 sonrası) "Do majör gamlar, bunların içerdiği akorlar ve bu akorların çevrimleri olmazsa olmaz
    bir konu bence. Belki de her birini farklı ünitelere bile yayabiliriz; farklı gam ve akorlar ile bu akor
    çevrimlerini öğrenmek kullanıcıyı kesinlikle üst seviyeye taşıyacak. Bunun için çokça pratik yapmasını sağlayalım.
    Eserler tarafında herhangi bir telif / lisans / patent sorunu yaşamayacaksak basit Beyer, Czerny egzersizleri
    veya bunların belli bölümleri içeriği çok kuvvetlendirecektir." Bestecilerde: "sen karar ver ama her gam ve
    seviyeye uygun progresif şekilde ilerleyen bir yapı."

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
- **Ekran klavyesi:** Her dersin klavyesi kendi notalarından hesaplanır (`fitKeyboard`). Notalar bir Do–Do oktavına
  sığıyorsa tam o oktav (8 beyaz tuş) gösterilir; daha genişse en pes notadan en tiz notaya kadar, en az bir oktav.
- **Ritim (Faz 5):** Oyunların saati `performance.now()`; metronom yalnızca ses ve Tone.Transport ile aynı vuruşlara
  hizalanır. Gecikme giriş kaynağına göre (MIDI, ekran, bilgisayar klavyesi) ayrı ölçülüp çıkarılır. Ritim ünitesinin
  ilk dersi baştan açık (nota okuma gerektirmiyor). Yanlış tuş can götürmez, kaçırılan vuruş götürür.
- **Ritim müfredatı (2026-10-15):** Serhan: "Ritim konusunda yeni başlayanın adapte olamayacağı kadar hızlı
  ilerliyoruz. Önce genel ritim kalıplarını kolaydan zora öğretip pratik yaptırmalıyız; her kalıp için defalarca
  tekrarın ardından bilindik ve lisanssız sevimli melodilerle desteklemeliyiz." Karar: iki ünite (Temel Vuruş;
  Sekizlikler ve Noktalılar, fa anahtarından sonra). Her kalıp aynı adımlarla: teori, Yankı, tekrar, oyun, şarkının
  ritmi, şarkı. Serhan: "Eserlerin orijinal isimleri de görünmeli, genel kültürünü de genişletelim": şarkılar Türkçe
  adın yanında orijinal adı, kökeni ve kısa bir bilgiyle gösterilir. Yalnızca anonim halk şarkıları ve ölümünün
  üzerinden 70 yıldan fazla geçmiş bestecilerin eserleri. Eski ders kimlikleri korunur, kimse geçtiği derse kilitli
  kalmaz.

## Yapılanlar

| Tarih      | Ne                                                                                                                                                                                                                                                                 | Nerede                                 |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------- |
| 2026-10-07 | Repo boştu; README ve yol haritası eklendi                                                                                                                                                                                                                         | `main`                                 |
| 2026-10-07 | Faz 0 + 1: iskelet, CI, Pages yayını, MIDI, ses, porte, Nota Avcısı, sonuç ekranı                                                                                                                                                                                  | PR #1, dal `faz-1-cekirdek`            |
| 2026-10-07 | Faz 2: XP, seri, kalpler, günlük hedef, rozetler, ders haritası, profil, zayıf notalar                                                                                                                                                                             | PR #2, dal `faz-2-oyunlastirma`        |
| 2026-10-07 | Faz 3: maskot Notiş, ders içi tepkiler ve seri, ses efektleri, konfeti, seviye atlama ekranı                                                                                                                                                                       | PR #3, dal `faz-3-karakterler`         |
| 2026-10-07 | Faz 4: PixiJS mini oyun motoru, beceri sağlayıcısı, Nota Kuşu ve Balon Patlatma                                                                                                                                                                                    | PR #4, dal `faz-4-mini-oyunlar`        |
| 2026-10-07 | Faz 5: metronom, zamanlama değerlendirmesi, gecikme kalibrasyonu, 5 ritim egzersizi, Dino Koşusu, Ritim Davulcusu, zamanlama raporu                                                                                                                                | PR #5, dal `faz-5-ritim-5xfbrn`        |
| 2026-10-07 | PR #1–#4 sırayla `main`'e birleştirildi (doküman çakışmaları `main` sürümüyle çözüldü)                                                                                                                                                                             | `main`                                 |
| 2026-10-07 | PR #5 birleşti, GitHub Pages yayını açıldı                                                                                                                                                                                                                         | `main`                                 |
| 2026-10-07 | Cila turu: 3/4, noktalı notalar (4 yeni ders), tempo hafızası, ritim XP etiketi, profilde ritim grafiği, iki klavyeye göre yardım                                                                                                                                  | PR #6                                  |
| 2026-10-07 | Faz 6: fa anahtarı ünitesi (10 ders), iki el ünitesi (7 ders), büyük porte, Orta Do köprüsü, melodi dersleri, Nota Barmeni, ellere göre rapor ve iki el uyumu, 3 yeni rozet                                                                                        | PR #7                                  |
| 2026-10-07 | Faz 7: gamlar ünitesi (18 ders), doğru yazım ve donanım imi, parmak numaraları ve geçiş uyarıları, Gam Merdiveni, Melodi Hafızası, gam raporu (eşit tempo, geçişler, iki el uyumu), 3 yeni rozet                                                                   | PR #9                                  |
| 2026-10-07 | Faz 7 iyileştirmeleri: Tempo Merdiveni (kalıcı tempo artışı), iki oktavlık gamlar, Si, Mi♭, La♭ parmak düzenleri, Kulaktan Hafıza, 6 yeni ders, "Hız Treni" rozeti                                                                                                 | PR #10                                 |
| 2026-10-08 | Faz 8 ekleri: Akor Barmeni (Nota Barmeni akorlarla, tek ve iki el), Kulaktan Akor ve Kulaktan Yedililer (akor türünü kulakla bulma), 4 yeni ders                                                                                                                   | PR #12                                 |
| 2026-10-07 | Faz 8: akorlar ünitesi (20 ders), akor algılama, çevrimler, yedili akorlar, ilerlemeler, arpejler, Akor Aşçısı, Uzay Savunması, Arpej Sörfü, akor raporu, 5 yeni rozet                                                                                             | PR #11                                 |
| 2026-10-08 | Başlangıç ünitesi: 4 teori dersi ve testleri, notalar ikişer ikişer (tanıtım + odaklı alıştırma), 2 oyun, "İlk Oktav" rozeti                                                                                                                                       | dal `claude/baslangic-dersleri-uox0fr` |
| 2026-10-08 | Başlangıç önerileri: ünite kilidi, Klavyesiz Okuma, fa anahtarının başına teori ve ikişer ikişer notalar, sesli anlatım                                                                                                                                            | dal `claude/baslangic-dersleri-uox0fr` |
| 2026-10-08 | Test modu (bütün dersler açık, her ekranda bağlamıyla not bırakma, notları kopyalama/paylaşma) ve cihazlar arası ilerleme kodu                                                                                                                                     | PR #13                                 |
| 2026-10-08 | Test modu ekleri: not paneli oyunu duraklatır, nota ekran görüntüsü, "Dersi bitir" kısayolu, notları .zip olarak indirme                                                                                                                                           | PR #13                                 |
| 2026-10-08 | Haritaya dönüş: ders bitince, başarısız olunca ya da yarıda çıkınca harita o derse kayar ve onu ortalar                                                                                                                                                            | Haritaya dönüş PR'ı                    |
| 2026-10-08 | Ekran klavyesi dersin notalarına göre: tek oktavlık derslerde tek oktav, nota okuma derslerinde hep Do'dan başlar                                                                                                                                                  | Tek oktav klavye PR'ı                  |
| 2026-10-08 | Nota Kuşu yeni karakter: Notiş tarzında kuş, kanat çırpma, geçişte sevinç (pırıltı, nota), çarpmada baş dönmesi (yıldızlar, tüyler), yanlış tuşta ter damlası                                                                                                      | Nota Kuşu karakter PR'ı                |
| 2026-10-15 | Ritim müfredatı: ritim iki üniteye bölündü (Temel Vuruş 28 ders; Sekizlikler ve Noktalılar 25 ders). Her kalıp: teori, Yankı, tekrar, oyun, şarkının ritmi, şarkı. Telifsiz şarkılar orijinal adları ve kökenleriyle; eski ders kimlikleri korundu                 | dal `claude/project-thread-wprkex`     |
| 2026-10-16 | Faz 9: Kulak Eğitimi ünitesi (24 ders), Kulak Dedektifi (yön, nota, aralık, akor rengi vakaları), aralıklar telifsiz şarkılarla, Melodi Hafızası'nda atlamalı, ters ve şarkı modları, Kulak raporu kartı, 3 yeni rozet                                             | dal `claude/project-thread-ytjjkw`     |
| 2026-10-16 | Faz 10: Şarkılar ünitesi (22 ders), Nota Şelalesi (bekleyen ve ritimli mod, bölüm tekrarı, yavaşlatma), 9 telifsiz şarkı ve Konser, tek elden iki ele, Şarkı kartı, 3 rozet                                                                                        | PR #32                                 |
| 2026-10-16 | Faz 11: her ünitenin sonunda üç aşamalı boss (10 canavar, can çubuğu, Boss kartı), günlük görevler (3 görev ve sandık), haftalık meydan okuma, 3 rozet                                                                                                             | PR #33                                 |
| 2026-10-17 | Faz 12: aralıklı tekrar (nota, akor, gam, arpej kartları, 5 kutu), Günün Karışımı dersi, uyarlanabilir hız ve tempo, okuma alanının genişlemesi, haftalık özet (profil ve harita)                                                                                  | dal `claude/project-thread-ytjjkw`     |
| 2026-10-18 | Oyun turu: Oyun Salonu (9 oyun × açılmış beceriler, sonsuz mod, rekorlar), combo ateşi ve oyun içi sürprizler, yeni oyunlar Nota Treni (7 telifsiz yeni şarkıyla) ve Kayıp Kuş Sesi                                                                                | dal `claude/project-thread-q9rplm`     |
| 2026-10-19 | Oyun turu 3: oyun arası Notiş (bir oyun ilk açılışta kuralını iki cümleyle anlatır, bir hamleyi gösterir), ses katmanları (seri uzadıkça eşlik, sonuçta "Melodini dinle"), hayalet (en iyi turunla yarış), Oyun Salonu'nda Bilinen şarkılar (17 telifsiz şarkı)    | dal `claude/project-thread-q9rplm`     |
| 2026-10-18 | Oyun turu 2: altın balon ve altın müşteri (bonus XP), ipucu parıltısı (takılınca doğru tuş parlar, ilk deneme sayılmaz, raporda ayrı), kostüm dolabı (10 kostüm, seviye ve rozetle açılır), Kurbağa Atlayışı (aralık okuma), Çift Kişilik Davul (soru-cevap ritim) | dal `claude/project-thread-q9rplm`     |
| 2026-10-20 | Faz 13: Piyanonu bağla sihirbazı ve raporu, sustain pedalı, örnek notalar piyanodan (MIDI çıkışı), ders sırasında ekran açık, Notiş simgeleri, yükleme ve güncelleme bildirimi, Android uygulaması (yerel USB ve Bluetooth MIDI)                                   | PR #45                                 |
| 2026-10-21 | Faz 14: Tonlar yolculuğu. 12 ton ünitesi (beşliler çemberi sırasıyla, her biri 15 ders): her tonda gam, iki el, tonun yedi akoru, çevrimler, kadanslar, arpejler, göreceli minör, hafıza, o tona taşınmış şarkı ve boss; Ton çemberi, 3 rozet                      | dal `claude/project-thread-9i936j`     |
| 2026-10-21 | Faz 15a: Etüt Kitaplığı (3 seviye, 38 ders), partisyon görünümü (iki porte, bağ, parmak, 16'lık, 2/4), Mutopia içe aktarma aracı, 9 kamu malı eser (Bach defteri, Pleyel, Czerny Op. 821); Uzay ve Akor Barmeni kartlarında ♯/♭, ton ünitelerinde bu iki oyun      | dal `claude/project-thread-vn0hlf`     |
| 2026-10-22 | Faz 15b: Kitaplık 8 seviye, 106 ders: beş parmak pozisyonu (kuralla), Hanon 1–10 (kuralla, her tona; ton ünitelerine birer ders), Burgmüller Op. 100'den 11 etüt, Çaykovski Çocuk Albümü'nden 3 parça, Czerny Op. 840, Kuhlau Andante; 4 rozet                     | dal `claude/project-thread-vn0hlf`     |
| 2026-10-22 | Faz 16a: elle karanlık mod (Ayarlar → Görünüm: Sistem / Açık / Koyu), haritada ve Etüt Kitaplığı'nda art arda bitmiş 3+ dersi tek kapsüle katlama, emoji yerine Notiş çizgisinde kendi simge setimiz (27 ders türü, harita kartları, üst çubuk)                    | dal `claude/project-thread-fj207v`     |
| 2026-10-07 | Plan genişletildi: gamlar, mini oyun matrisi, 14 faz; devir belgeleri yazıldı                                                                                                                                                                                      | `main`                                 |

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

- **Başlangıç ünitesi:** Sıra Do-Sol (Do pozisyonunda 1. ve 5. parmak), Re-Mi, Fa-La, Si-Do5. Serhan dört öneriyi de istedi ("4 önerin harika,
  uygulayalım"): diğer üniteler Başlangıç'tan sonra açılır ama içinde yıldızı olan ünite açık kalır, böylece mevcut
  ilerleme kaybolmaz; fa anahtarı da sol elde Do pozisyonuyla (serçe Do3, başparmak Sol3) ikişer ikişer başlar;
  klavyesiz okuma testleri; sesli anlatım tarayıcının Türkçe sesiyle, varsayılan açık. Testlerde can yok; ilk
  cevap sayılır, yanlışta açıklama gösterilip yeniden denenir. Seçenekler her seferinde karışık sırada. Ünite 1 kilitli
  değil (mevcut ilerleme bozulmasın); harita "BAŞLA" ile yeni kullanıcıyı Başlangıç'a yönlendirir.

- **Yatay telefon yerleşimi:** Serhan telefonu yan çevirince ders ekranının sığmadığını, klavyenin ekranın altında
  kaldığını fark etti ve ayrı bir iş olarak yapılmasını istedi ("uygundur"). Yatay ve kısa ekranlarda (yükseklik
  ≤ 520 px) ders ekranı tek bir ekrana sıkıştırılıyor: üst çubuk, maskot ve yönerge birer satıra iniyor, porte ya da
  oyun alanı kalan yüksekliğe göre küçülüyor, klavye altta sabit bir pay alıyor. Ritim ekranında başlangıç kartı
  (tempo, metronom, Başla) tek satır; teori kartlarında resim metnin yanında. Yalnızca CSS değişti, dikey yerleşim
  aynı kaldı.

- **Görünüm test kümesi:** Serhan her oyunlaştırma türü için masaüstü ve mobil görünümü kapsayan bir test kümesi
  istedi ("Hepsinden önce"). Her oyun türünden bir ders masaüstü penceresinde (1366×700), dikey ve yatay telefonda
  açılıp biraz oynanıyor, düzen ölçülüyor ve ekran görüntüsü alınıyor; CI'da her PR'da çalışıyor. Masaüstü penceresi
  1366×768 ekranın tarayıcı çubukları düşülmüş hali, çünkü gerçek tarayıcıda sayfaya kalan yükseklik ekrandan kısa.
  Bilinen sorunlar raporda görünür ama CI'ı düşürmez, düzeltilince listeden çıkarılır. Serhan raporun önerilerini
  istedi ("önerilerinle devam edelim"): porteli derslerde ders ekranı pencere yüksekliği kadar ve porte kalan alana
  göre küçülüyor (masaüstünde klavye artık kaydırmadan görünüyor); Uzay Savunması istilacıları kartları kesik
  girmesin diye ekranın biraz içinden, solarak beliriyor. İki Oktav derslerinde telefonda iki elin tuşlarını birlikte
  gösteren özel klavye düzeni yapılmadı: çok efor ve kötü görünme riski.

- **Haritaya dönüş:** Serhan bir ders ya da oyun bittikten sonra "Derslere dön" deyince haritanın en başa atmasını
  istemedi: tıklanan derse dönülmeli ya da oraya şık bir kaydırma olmalı. Ders bitince, canlar bitince ya da dersten
  yarıda çıkınca harita önce dersin biraz üstüne atlar, son parçayı yumuşak kaydırarak dersi ekranın ortasına getirir
  ve ders düğmesinin etrafında iki kez halka yayılır; sistem "hareketi azalt" diyorsa doğrudan oraya atlar. Profilden
  ve gecikme ayarından dönünce harita bırakıldığı yerde durur; haritadan açılan her ekran en üstten başlar. Karar:
  bir sonraki ders yeni açıldıysa bile oynanan derse dönülür; bir sonraki ders hemen altında göründüğü için ayrıca ona
  kaydırılmadı. Görünüm test kümesi her dersten sonra dönüşü, yarıda çıkışı, hareket azaltılmış dönüşü ve profilden
  dönüşü üç ekranda ölçüyor.
  Aynı işte Serhan ayarların sayfanın en altında değil üst menüde olmasını, üst menünün de yapışkan olmasını istedi:
  üst menü (seri, XP, günlük hedef, seviye) harita kaydırılırken ekranın üstünde kalıyor; ayarlar menüdeki ⚙️
  düğmesiyle haritanın üstünde bir panel olarak açılıyor, ✕, Esc ya da panelin dışına dokunmak kapatıyor.

- **Kulak eğitimi (Faz 9):** Serhan Faz 9'a "evet, merge ve devam" dedi; plan konuya yazılıp onay beklemeden
  önerilen haliyle yapıldı. Kulak dersleri ses ister: piyano örnekleri yüklenemezse (çevrimdışı) yerine küçük bir
  sentez ses çalar, böylece ders hiç sessiz kalmaz. Nota bulmada önce referans Do çalar, çünkü mutlak kulak
  beklenmez. Vakalarda süre yok (kulak acele istemez), can var; ilk cevap sayılır, yanlışta seçilen ve doğru ses art
  arda çalınır, sonra yeniden denenir. Aralıklar yarım sesle ölçülür; akor renkleri kök durumda, kök rastgele. Akor
  türleri yalnızca duyulduğu için yazımsız yarım ses kalıplarıdır (`games/ear/intervals.ts`), `music/chords.ts`'e
  artık akor eklenmedi. Şarkı Hafızası iki ölçülük cümlelerle çalışır ve ritimdeki şarkıları (Ritim ünitelerinin
  `tunes.ts`'i) kullanır; orijinal adı, kökeni ve kısa bilgisi başta gösterilir. Şarkının tamamı yalnızca 32
  notadan kısaysa en son dizi olur.

- **Şarkılar (Faz 10):** Serhan Faz 9'un birleşmesinin ardından "kaldığımız yerden devam" dedi; plan konuya yazılıp
  onay beklemeden yapıldı. Şelale nota yerine klavyenin üstüne çizilir (porte yok): nota okumayı değil şarkı çalmayı
  çalıştırır, porte okuma diğer ünitelerde. Bekleyen modda süre ve can yoktur, ilk denemede doğru basılan adımlar
  sayılır; hatalı bölüm yalnızca bir kez tekrar eder ki ders uzamasın. Bölüm tekrarı da puana sayılır (düzeltmek
  ödüllendirilir); kartta "tekrarda düzeldi" yazar. Ritimli modda notalar ritim derslerindeki gibi basılı tutulur.
  Şarkılar Do majöre taşındı, sol el ilk şarkılarda ölçü başına bir ya da iki uzun bas notasıdır (Do, Fa, Sol).
  Türkçe halk şarkısı eklenmedi: notalarından emin olunan, telifsiz bir kaynak gerekiyor (öneri olarak soruldu).

- **Boss'lar ve görevler (Faz 11):** Serhan Faz 10'un birleşmesinden sonra "Devam" dedi. Boss yeni bir oyun değil,
  ünitenin kendi derslerinden üç kısa aşama: böylece her oyun türü boss'ta da çalışır ve rapor aynı konuları gösterir.
  Boss sonraki ünitelerin kilidini tutmaz (Başlangıç'ı bitiren eski ilerleme kilitlenmesin diye); ek bir meydan
  okumadır. Kaybedilen boss yıldız vermez ama ilk denemede doğru notaların XP'si kalır. Görevler gün anahtarından
  seçilir (aynı gün hep aynı üç görev) ve sadece açık ünitelere uyanlar gelir. Görev XP'si günlük hedefe sayılır.

- **Akıllı öğrenme (Faz 12):** Serhan Faz 11'in birleşmesinden sonra devam dedi (oyun ve arayüz fikirleri ayrı
  thread'lerde). Aralıklı tekrar için Leitner kutuları seçildi: anlaşılır ("kutu 2 → 3, 4 gün sonra") ve sonuç
  ekranında gösterilebilir. Kartın kutusu sadece zamanı gelince yükselir, yoksa aynı gün birkaç ders oynamak kartı
  hemen 5. kutuya taşırdı. Ritim dersleri nota kartı üretmez (zamanlama ölçülür), kulaktan akorlar da akor kartı
  üretmez. Karışım yıldız tutmaz (her gün değişir), canlar bitse de sonraki aşamaya geçer. Hız sadece nota okuma
  oyunlarında değişir; ritim oyunlarında hız tempo demektir ve tempo zaten hatırlanıyordu.

- **Oyun turu:** Serhan ayrı bir başlıkta oyun fikirleri istedi, 15 fikirden önerilen sırayı "hadi yapalım" diye
  onayladı ve "lisanssız, bilindik yeni melodiler" eklenmesini istedi. Salon'daki oyunlar yıldız vermez, kendi
  rekorunu tutar; sonsuz oyun hep canlar bitince biter, bu yüzden aralıklı tekrar kartlarına ve nota
  istatistiklerine yazılmaz, hızı da uyarlanmaz. Sürprizler (8 sn, %20 hızlı, puan iki kat) yalnızca oyun puanını
  değiştirir, XP'yi değil; kulak oyunu sakin kalsın diye Kayıp Kuş Sesi'nde sürpriz yok. Altın balon ve ipucu
  parıltısı XP'yi ve ilk deneme doğruluğunu değiştirdiği için yapılmadı. Yeni şarkılar: Dvořák (Goin' Home), Grieg
  (Sabah), Brahms (Ninni), Stephen Foster (Oh! Susanna), Row Row Row Your Boat, Old MacDonald, Alouette.

- **Oyun turu 2:** Serhan ertelenen fikirler için "yap gitsin" dedi. Altın hedef her yedi hedefte bir gelir (ilki
  dördüncü), ilk denemede vurulursa +5 XP ve üç kat oyun puanı verir. İpucu parıltısı varsayılan olarak açıktır
  (Ayarlar'dan kapanır): alıştırmada 4 saniye, oyunlarda hedef tehlikeye yaklaşınca doğru tuş parlar; parlayan
  tuşla verilen cevap ilk deneme sayılmaz, sonuçta "ipucuyla bulduğun notalar" ayrı satırda yazar. Kostümler seviye
  ve rozetle açılır, sadece görünüştür (XP vermez). Kurbağa Atlayışı yalnızca beyaz tuşlarda zıplar ve aynı aralığı
  üç kez üst üste sormaz; raporda konu aralık ve yönüdür. Çift Kişilik Davul'da ilk turlar yankıdır, sonra cevap
  serbesttir: vuruşta kalan en az üç nota yeter, Notiş'ten farklı ritim ayrıca sayılır.

- **Oyun turu 3:** Serhan kalan üç fikir için "hepsini yapıver" dedi ve Oyun Salonu'nda bilindik melodileri çalmayı
  önerdi. Oyun arası Notiş kuralı bir oyun türü ilk açılınca bir kez anlatır (cihazda hatırlanır, karşılama gibi);
  kart açıkken oyun saati durur, basılan tuşlar sayılmaz. Ses katmanları nota oyunlarında doğru seriye yumuşak bir
  eşlik ekler: 3'te bas, 5'te beşlisi, 10'da üstte parıltı; yanlışta seri ve eşlik sıfırlanır. Ayarlar'dan
  kapanır ("Oyun müziği"). Sonuçta "Çaldığın melodi" kartı doğru çalınan notaları sırayla geri çalar (kulak oyunu
  Kayıp Kuş Sesi hariç). Hayalet yalnızca kendi en iyi turundur: sonsuz oyunlarda saniye saniye puan, ritim
  oyunlarında nota nota zamanlama yüzdesi; daha iyi bir tur gelince yerini alır, test bitişi hayalet bırakmaz.
  Salon'un yeni "Bilinen şarkılar" becerisi Nota Kuşu, Balon ve Nota Treni'nde ritim ünitelerinin ve trenin 17
  telifsiz şarkısını karışık sırayla çaldırır; her şarkının adı, aslı ve kökeni oyunda ve sonuçta yazar. Beceri
  Nota Treni'nin ilk dersinden yıldız alınca açılır.

- **Faz 13 (gerçek piyano ve her cihaz):** Serhan her yeni fazdan önce içeriğin yeniden ele alınmasını önerdi ve bu
  kural oldu. Faz 13'ün yeni içeriğini onayladı: önce gerçek piyano hazırlığı, kurulabilir uygulama cilası ve yalnızca
  Android ("evet", "önerilerinle devam"). Üyelik ve Duolingo gibi sosyal özellikler kesin olarak gelecek (hesap fazı), bu
  yüzden Google Drive yedeği yapılmadı. Pedal yalnızca tutma süresini değiştirir (pedal basılıyken bırakılan tuş, pedal
  kalkana ya da tuşa yeniden basılana kadar tutulmuş sayılır); akor algılama gerçek tuş bırakışlarını görmeye devam
  eder. Örnek notalar yalnızca bağlı ve kendi sesi olan bir klavyenin aynı adlı çıkışına gider; öğrencinin kendi
  bastığı tuşların uygulama sesi değişmez. Android'de WebView MIDI desteklemediği için yerel bir eklenti yazıldı ve
  web kodu onu tarayıcının MIDI arayüzü gibi kullanır. İmzalama anahtarı depoya konmadı: CI gizli değerleri
  (`ANDROID_KEYSTORE_BASE64` vb.) eklenene kadar Android uygulaması hata ayıklama imzasıyla derlenir.

- **Faz 14 (Tonlar yolculuğu):** Plan önce gözden geçirildi (`/mnt/project-files/faz-14/plan.md`). Serhan'ın
  cevapları: önce içerik, görsel dünya sonra ("evet"); 12 ton ("12"); ton üniteleri beşliler çemberi sırasıyla
  birbirini açar ("evet"); etütlerde dört besteci (Beyer, Czerny, Hanon, Burgmüller), her tona ve seviyeye göre
  kolaydan zora. Yeni faz sırası: 14 Tonlar, 15 Klasik etütler, 16 Görsel dünya, 17 Hesap ve sosyal, 18 Yerleştirme,
  19 Yayın. Ton üniteleri Akorlar ünitesinden sonra gelir; ilki Akorlar bitince açılır. Dörder tonluk dört seviye
  (Do Sol Fa, Re Si♭ La, Mi♭ Mi La♭, Si Re♭ Fa#) zorluğu artırır. Minörde doğal ve armonik gam çalışılır; melodik
  minör parmakları farklı olduğu için ton ünitelerinde yok. Minör akorlarda V, V7 ve vii° armonik minörden (yeden ses
  yükselir). Arpejler yalnızca kökü beyaz tuş olan akorlarda (1-2-3-5 parmağı orada standart). Ton ünitelerinin akor
  oyunu Akor Aşçısı: Uzay Savunması ve Akor Barmeni'nin küçük kartları değiştirme işareti çizmiyor. Şarkılar Do
  majörden derece derece tona taşınır (aynı melodi, tonun harfleriyle). Melodik minör ve diğer akor oyunları
  sonraya bırakıldı.

- **Faz 15a (Klasik etütler, ilk bölüm):** Plan gözden geçirildi (`/mnt/project-files/faz-15/plan.md`). Serhan'ın
  cevapları: Mutopia ve IMSLP'ye ağ izni (yeni bulut ortamı), "tamam başla, arkada çöp de bırakmayalım". Kurallar:
  nota ezberden yazılmaz, yalnızca "Public Domain" işaretli Mutopia eserleri alınır (başlık ve katalog kaydı ikisi de),
  her eser özgün adı ve kökeniyle görünür. Mutopia'da Beyer ve Czerny Op. 599 bulunmadı; seviye 1–3 Anna Magdalena
  Bach defteri, Pleyel ve Czerny Op. 821 ile kuruldu (Serhan'a karar kartıyla soruldu). Üçleme, ölçü değiştiren ve
  ortasında eksik ölçü olan parçalar içe aktarma aracınca reddedilir; süslemeler (mordan, tril) çalınmaz, yalnızca ana
  nota. Tekrarlar açılmış yazılır (ölçü numaraları çalındığı gibi). LilyPond deponun dışında kalır (araç
  `LILYPOND` ile yolunu alır); indirilenler geçici klasörde, iş bitince silinir.

- **Faz 15b (Klasik etütler, ikinci bölüm):** Serhan Beyer ve Czerny Op. 599 için "marka / isimden ziyade o tip başka
  pratiklerle içeriği genişletmek konumuz" dedi, sonra "hallet işte sen". Beyer tarzı beş parmak alıştırmaları
  uygulamanın kendi parçaları olarak kuralla yazıldı (`src/games/etudes/drills.ts`). Hanon'un kalıpları 1873 baskısının
  Mutopia'daki dizgisinden okundu (o dizgi CC BY-SA olduğu için depoya alınmadı; yalnızca her alıştırmanın ilk çıkış ve
  iniş kalıbı ile Hanon'un parmakları, kamu malı eserin kendisi); kural her tona taşır. Burgmüller Op. 100'ün 7, 9, 12,
  14, 15 ve 18. etütleri, Czerny Op. 840'ın 2–5, 7, 8 ve 10. parçaları araçtan geçmedi (üçleme, ton değişimi ya da
  LilyPond 2.24 ile derlenmeyen kaynak); Burgmüller No. 17 (3/8) ve Czerny Op. 840 No. 9 (40 süs notası) bilerek
  alınmadı. Clementi Op. 36 No. 1 (MIDI dosyası yok), Beethoven WoO 82 (MIDI tutmadı), Haydn menüetleri ve Kuhlau'nun
  Allegro'su araçtan geçmedi; Kuhlau'nun Rondo'su (158 ölçü) şimdilik çok uzun.

- **Faz 16 (Görsel dünya):** Plan gözden geçirildi (`/mnt/project-files/faz-16/plan.md`). Serhan'ın cevapları: tek PR,
  önce 16a (karanlık mod, katlama, simgeler) sonra 16b (manzaralar, Notiş haritada, geçişler, açılış, küçük
  dokunuşlar); ton üniteleri tek "balon yolculuğu" (dört manzara, üç tonda bir değişir, her ünitenin rengi ve ton
  tabelası); katlama eşiği 3 ders; açılış animasyonu her açılışta, 1 saniyeden kısa, dokununca geçer; düğme tık sesi
  varsayılan açık; kalıcı Android imza anahtarı sonraya. Yerleştirme sınavı Faz 18'de kalıyor. Simgeler kodla çizilir
  (SVG), dışarıdan resim ya da lisanslı simge kullanılmaz.

## Açık konular

- **Gerçek MIDI testi yapılmadı.** Uygulama tarayıcıda ekran klavyesiyle uçtan uca denendi; gerçek bir Bluetooth/USB
  klavyeyle ilk deneme sahibinde.
- **Klavye port adları** (`src/midi/keyboards.ts`) tahmin; sahip klavyeleri bağlayınca görünen adlarla doğrulanmalı.
  "Piyanonu bağla" sihirbazının raporu bunun için yazıldı.
- **Android uygulaması imzası:** CI gizli değerlerine kalıcı bir anahtar eklenmeden her derleme farklı hata ayıklama
  imzası taşır; yeni sürüm eskisinin üzerine kurulamazsa eskisini kaldırmak gerekir (ilerlemeyi önce "İlerlemeyi taşı"
  ile al). Android uygulaması gerçek cihazda henüz denenmedi.
