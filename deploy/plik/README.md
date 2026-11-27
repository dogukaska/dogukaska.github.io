# Dosya Paylaş için Plik

Dijital Çakı arayüzü GitHub Pages üzerinde çalışır. Dosyaları Plik saklar. Alıcı bağlantıları için Plik sunucusunun internetten HTTPS ile ulaşılabilir ve indirme boyunca açık olması gerekir. Mevcut bir Linux sunucu veya Docker destekli NAS kullanılabilir. Saklama alanı ve bağlantı hızı çalıştırdığın cihaza bağlıdır.

1. Plik için kullandığın alan adını sunucuya yönlendir ve TCP 80 ile 443’ü erişilebilir yap.
2. Bu dizinde `PLIK_DOMAIN=dosya.ornek.com docker compose up -d` komutunu çalıştır. Caddy HTTPS sertifikasını otomatik alır.
3. İlk açılışta Plik yönetici parolasını `docker compose logs plik` çıktısında gösterir. Sunucu yönetimine bu parolayla erişebilir, gerekiyorsa değiştirebilirsin.
4. `docker compose exec plik ./plikd token create --login admin --comment dijital-caki` ile bir API anahtarı oluştur. Sunucu adresini ve anahtarı [Dosya Paylaş](https://dogukaska.github.io/dosya/paylas/) ekranına gir. Anahtarı gizli tut.

Kurulum, anonim yüklemeleri kapatır ve alıcının bağlantıyla hesabı olmadan indirmesine izin verir. Dijital Çakı gönderi başına toplam 15 GB kabul eder. Plik ayrıca dosya başına 15 GB ve hesap başına 100 GB sınırı uygular. `MaxUserSizeStr` değerini kullanılabilir disk alanına göre düşürebilirsin. Dosyalar 3 veya 7 gün tutulur. Süre dolunca bağlantı kapanır ve Plik dosyaları temizlik döngüsünde siler.

Dijital Çakı API anahtarını tarayıcı deposuna yazmaz. Tarayıcıda son kullanılan sunucu ile gönderi bağlantılarının bilgileri kalır. Bir gönderiyi silmek için oluşturduğun anahtarı tekrar gir. Bağlantıyı bilen herkes dosyaları süre sonuna kadar indirebilir.

[Plik Docker kılavuzu](https://root-gg.github.io/plik/guide/docker.html) · [Plik kaynak kodu ve MIT lisansı](https://github.com/root-gg/plik)
