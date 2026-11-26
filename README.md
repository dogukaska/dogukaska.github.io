# Dijital Çakı

https://dogukaska.github.io adresindeki araç merkezi.

Mevcut bir uygulamanın içindeki yeni özellik, kendi uygulama deposunda geliştirilir. Bağımsız bir araç için `apps.js` dosyasında ilgili kategoriye bir satır ekle. Yeni bir alana giren araç için ayrı bir depo ve kategori oluştur. Menü listesi değiştiğinde `app.js` ve `index.html` içindeki ilgili sürüm numaralarını artır.

Yeni araç ekranları ortak form, panel ve odak düzenini `tool.css` üzerinden alır. Ana menü araması araç adlarını, açıklamalarını ve kategorileri Türkçe karakter farklarına takılmadan eşleştirir.

Tüm araçlar için [kompakt arayüz kuralları](UI.md) geçerlidir.

## Tarayıcı denetimi

GitHub Actions, hub ve uygulama PR'larında aday sürümü diğer araçlarla aynı yerel adreste çalıştırır. Chromium'da kamera oturumu, dosya işlemleri ve dışa aktarımlar denenir. Linux WebKit'te dar ekranda katalog, araç sayfaları ve not kaydı kontrol edilir. Kur verisi, medya ve belgeler test sırasında üretilir. Dosyalar ve istekler yerel test ortamında kalır.

Yerelde `belge`, `foto`, `metin-veri`, `pdf-epub`, `qr` ve `video` depolarını hub deposunun yanına klonla. Farklı bir dizin kullanıyorsan `DK_APPS_ROOT` değişkenine bu depoların bulunduğu dizini ver. Linux'ta OCR örneği için DejaVu Sans yazı tipi kullanılır.

```sh
npm ci
npx playwright install --with-deps chromium webkit
npm run test:browser
```

Tek motoru seçmek için `npm run test:browser -- --project=chromium` veya `--project=webkit-mobile` kullan.

### Gerçek iPhone kontrolü

Linux WebKit testi mobil sayfa düzenini kapsar. Fiziksel iPhone kamerası, odak ve Safari'nin izin ekranı için şu akışları gerçek cihazda dene.

- Belge Tarayıcı'yı Safari'de aç. Kamera iznini ver, ilk sayfaya odaklan ve sayfanın dört kenarının görüntüde olduğuna bak. Kamerayı kapatınca kamera göstergesinin söndüğünü doğrula.
- Taranan bir sayfayı aç, köşelerini elle düzelt ve PDF önizlemesinde sonucun korunduğunu kontrol et.
- Kitap tararken son sayfayı arka kapak yap, ardından iç sayfaya geri çevir. Kaydı yeniden açıp son durumu ve EPUB aktarımını doğrula.
- iPhone'da kaydedilmiş bir MOV dosyasını Sesi Yazıya Çevir aracında aç. Türkçe konuşmanın çıktıda görüldüğünü ve TXT indirmesini kontrol et.
