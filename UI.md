# Dijital Çakı arayüzü

- Yeni araçlar `/tool.css` kullanır. Eski araçlara ortak ölçüleri uygulamak için mevcut stilin ardından `/ui-compact.css` yüklenir ve gövdeye `compact-ui` eklenir.
- Sık kullanılan denetimler masaüstünde 34 px, dokunmatik ekranda 36 px. Bir işlem grubunda tek belirgin birincil düğme kullan. Simgeli denetimlerin erişilebilir adı ve klavye odağı olmalı.
- Aynı göreve ait seçenekleri tek bir kompakt grupta tut. Dosya, çalışma alanı ve çıktı arasına gereksiz kart koyma. Sık gerekmeyen ayarları gerektiğinde açılan bir bölümde sun.
- Dosyanın adı görünür kalsın. Uzun adlar düzeni bozmasın. Durum mesajlarını kısa tut ve ekran okuyucu için duyur.
- Antrasit ve kırık beyaz renkler, açık ve koyu tema, kısa Türkçe metinler. 320 px genişlikte yatay taşma olmadan, klavye ve dokunmayla kullanılabilmeli.

Kompakt eylem grupları için [Arc UI Button Group](https://uiarc.dev/components/button-group) ve [Action Button](https://uiarc.dev/components/action-button) kaynakları incelendi. Düzen mevcut HTML ve CSS ile uygulanır.
