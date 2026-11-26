// Yeni bir bağımsız aracı ilgili kategoriye ekle. icon, icons.js içindeki simge adı.
export const CATEGORIES = [
  { id: "not", name: "Notlar", apps: [
    { name: "x-notes", desc: "Yerel notlar, kategori profilleri ve yanıtlar", terms: "not defteri günlük giderler metin fikir", url: "/x-notes/", icon: "note" },
  ] },
  { id: "foto", name: "Fotoğraf", apps: [
    { name: "Foto Araçları", desc: "Arka plan sil, dönüştür, sıkıştır", terms: "heic jpg jpeg png webp avif resim format arka plan", url: "/foto/", icon: "image" },
    { name: "Görsel Gizle", desc: "Yüzleri bul, bulanıklaştır veya kapat", terms: "mozaik sansür fotoğraf karart", url: "/foto/gizle/", icon: "image" },
    { name: "Hedef Boyuta Küçült", desc: "Görseli bir KB sınırına indir", terms: "fotoğraf sıkıştır dosya boyutu kb mb", url: "/foto/hedef-boyut/", icon: "image" },
  ] },
  { id: "video", name: "Video ve Ses", apps: [
    { name: "Video Araçları", desc: "Ses çıkar, GIF yap", terms: "mp3 wav hareketli resim gif", url: "/video/", icon: "video" },
    { name: "Ses Kırp", desc: "Bir bölümü seç ve MP3 veya WAV indir", terms: "ses kes ses düzenle", url: "/video/ses-kirp/", icon: "scissors" },
    { name: "Sesi Yazıya Çevir", desc: "Türkçe ses kaydını metne dönüştür", terms: "sesli mesaj konuşma deşifre transkripsiyon mp3 m4a wav", url: "/video/ses-yaziya/", icon: "file" },
  ] },
  { id: "belge", name: "Belge ve Kitap", apps: [
    { name: "Belge Tarayıcı", desc: "Belgeyi tara, düzelt, PDF yap", terms: "kamera tarama pdf kitap", url: "/belge/", icon: "scan" },
    { name: "Kitap Çevirici", desc: "Türkçe PDF’yi EPUB’a dönüştür", terms: "e kitap e-kitap dönüştür e okuyucu", url: "/pdf-epub/", icon: "book" },
    { name: "PDF Düzenle", desc: "Sayfaları birleştir, sırala ve döndür", terms: "pdf birleştir pdf ayır sayfa çıkar", url: "/belge/pdf/", icon: "file" },
    { name: "Metni Kopyala", desc: "Görselden Türkçe metin çıkar", terms: "ocr resimden yazı fotoğraftan metin", url: "/belge/ocr/", icon: "scan" },
  ] },
  { id: "takip", name: "Takip", apps: [
    { name: "Döviz ve Altın Çevirici", desc: "Altın, dolar, euro ve sterlin kurlarını gör, TL karşılığını hesapla", terms: "gram altın usd avro eur gbp alış satış", url: "/doviz/", icon: "exchange" },
  ] },
  { id: "kod", name: "QR ve Barkod", apps: [
    { name: "QR Kod", desc: "Wi-Fi, IBAN ve kartvizit için QR oluştur", terms: "karekod whatsapp telefon konum bağlantı", url: "/qr/", icon: "qr" },
    { name: "QR Oku", desc: "Kameradan veya görselden QR oku", terms: "karekod tara qr okut", url: "/qr/oku/", icon: "scan" },
    { name: "Barkod Oluştur", desc: "Code 128 ve EAN‑13 üret", terms: "ean market ürün barkodu", url: "/qr/barkod/", icon: "file" },
  ] },
];
