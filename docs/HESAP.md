# Hesap ve arkadaşlar: kurulum

Uygulamanın hesap ve arkadaş özellikleri (Faz 17) bulutta [Supabase](https://supabase.com) kullanır. Supabase hazır
bir veritabanı ve giriş servisidir, ücretsiz planı bize yeter. Kurulum bir kez yapılır, yaklaşık 15 dakika sürer.
Kurulum bitene kadar hesap bölümü uygulamada hiç görünmez; uygulama bugünkü gibi çalışır.

Gerekenler: GitHub hesabın (Supabase'e onunla girilir) ve Google hesabın (Google ile giriş için).

## 1. Supabase projesi

1. <https://supabase.com> → **Start your project** → **Continue with GitHub**.
2. **New project**:
   - Name: `piyano`
   - Database Password: **Generate a password**, bir yere kaydet (uygulama bunu kullanmaz, ama projeyi yönetirken
     lazım olabilir)
   - Region: **Central EU (Frankfurt)** (Türkiye'ye en yakını)
   - Plan: **Free**
3. Proje birkaç dakikada hazır olur.

## 2. Tablolar ve güvenlik kuralları

1. Soldaki menüden **SQL Editor** → **New query**.
2. Depodaki [`supabase/schema.sql`](../supabase/schema.sql) dosyasının bütün içeriğini yapıştır → **Run**.
   "Success. No rows returned" görmelisin.

Bu dosya dört tablo kurar: ilerleme, oyuncu özeti, arkadaşlıklar, alkışlar. Her tabloda "herkes yalnız kendi
satırını görür, arkadaşının özetini görür" kuralı vardır. Kurallar `src/cloud/schema.test.ts` ile test edilir.

## 3. E-posta ile giriş (6 haneli kod)

Uygulama e-postaya bağlantı değil kod gönderir; böylece Android uygulamasında da çalışır.

1. **Authentication** → **Emails** (ya da **Email Templates**).
2. **Magic Link** şablonunun içeriğini şununla değiştir:

   ```html
   <h2>Dijital Piyano Öğretmeni</h2>
   <p>Giriş kodun: <b>{{ .Token }}</b></p>
   <p>Kodu uygulamadaki kutuya yaz. Bu e-postayı sen istemediysen görmezden gel.</p>
   ```

3. **Confirm signup** şablonuna da aynısını koy (ilk kez giren kişiye bu gider).

Not: Supabase'in kendi e-posta göndericisi saatte birkaç e-postayla sınırlıdır. Kendimiz için yeter; çok kişi
kullanırsa ileride kendi e-posta servisimizi (SMTP) bağlarız.

## 4. Adresler

**Authentication** → **URL Configuration**:

- Site URL: `https://serhanco.github.io/DijitalPiyanoOgretmeni/`
- Redirect URLs (**Add URL** ile iki tane):
  - `https://serhanco.github.io/DijitalPiyanoOgretmeni/`
  - `io.github.serhanco.piyano://auth` (Android uygulaması Google girişinden buraya döner)

## 5. Google ile giriş

1. <https://console.cloud.google.com> → üstteki proje seçici → **New project** → ad: `piyano` → **Create**.
2. **APIs & Services** → **OAuth consent screen** (ya da **Google Auth Platform** → **Branding**):
   - App name: `Dijital Piyano Öğretmeni`, destek e-postası: kendi adresin
   - Audience: **External**
   - Uygulamayı **Publish** et (yayınlamazsan yalnız "Test users" listesine eklediğin hesaplar girebilir)
3. **Credentials** (ya da **Clients**) → **Create credentials** → **OAuth client ID**:
   - Application type: **Web application**
   - Authorized redirect URIs: Supabase'deki adres. Bunu Supabase'de **Authentication** → **Sign In / Providers**
     → **Google** sayfasında "Callback URL" olarak görürsün; `https://<proje-kodu>.supabase.co/auth/v1/callback`
     biçimindedir.
4. Çıkan **Client ID** ve **Client secret**'i Supabase'de **Authentication** → **Sign In / Providers** →
   **Google** → **Enable** → ilgili kutulara yapıştır → **Save**.

Client secret yalnız Supabase'de durur; depoya ya da GitHub'a girmez.

## 6. Uygulamaya bağlama

1. Supabase'de **Project Settings** → **API** (ya da **Data API** / **API Keys**):
   - **Project URL**'i kopyala (`https://<proje-kodu>.supabase.co`)
   - **anon public** anahtarını kopyala (yeni projelerde adı **publishable key**, `sb_publishable_` ile başlar;
     ikisi de olur). **service_role / secret** anahtarını hiçbir yere koyma.
2. GitHub'da depo → **Settings** → **Secrets and variables** → **Actions** → **Variables** sekmesi → **New
   repository variable**:
   - `SUPABASE_URL` = Project URL
   - `SUPABASE_ANON_KEY` = anon (publishable) anahtar
3. **Actions** → **Deploy to GitHub Pages** → **Run workflow**. Birkaç dakika sonra sitede Ayarlar'da "Hesap"
   bölümü çıkar; Android uygulamasının yeni sürümünde de.

anon anahtarı herkese açık olması için tasarlanmıştır (sitenin kodunda görünür); veriyi koruyan, 2. adımdaki
kurallardır.

## Sonra

- **Uyku:** Ücretsiz planda proje bir hafta hiç kullanılmazsa uyutulur. `.github/workflows/supabase-keepalive.yml`
  her pazartesi projeye küçük bir istek atar, böylece uyumaz.
- **Yedek:** Ücretsiz planda Supabase'in günlük yedeği yoktur. İlerleme her cihazda da durduğu için bulut tek kopya
  değildir; Ayarlar → İlerlemeyi taşı ile elle yedek de alınabilir.
- **Deneme:** `npm run cloud`, bütün akışı tarayıcıda sahte bir bulutla (`localStorage` `dpo-cloud` = `fake`)
  dener. Kendi tarayıcında denemek için konsolda `localStorage.setItem('dpo-cloud', 'fake')` yazıp sayfayı yenile;
  e-posta kodu her zaman `123456`.
