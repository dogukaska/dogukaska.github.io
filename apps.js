// Yeni bir bağımsız aracı ilgili kategoriye ekle. icon, icons.js içindeki simge adı.
export const CATEGORIES = [
  { id: "foto", name: "Fotoğraf", apps: [
    { name: "Foto Araçları", desc: "Arka plan sil, dönüştür, sıkıştır", url: "/foto/", icon: "image" },
    { name: "Görsel Gizle", desc: "Hassas alanları kapat ve kırp", url: "/foto/gizle/", icon: "image" },
    { name: "Hedef Boyuta Küçült", desc: "Görseli bir KB sınırına indir", url: "/foto/hedef-boyut/", icon: "image" },
  ] },
  { id: "video", name: "Video ve Ses", apps: [
    { name: "Video Araçları", desc: "Ses çıkar, GIF yap", url: "/video/", icon: "video" },
    { name: "Ses Kırp", desc: "Bir bölümü seç ve MP3 veya WAV indir", url: "/video/ses-kirp/", icon: "scissors" },
  ] },
  { id: "belge", name: "Belge ve Kitap", apps: [
    { name: "Belge Tarayıcı", desc: "Belgeyi tara, düzelt, PDF yap", url: "/belge/", icon: "scan" },
    { name: "Kitap Çevirici", desc: "Türkçe PDF’yi EPUB’a dönüştür", url: "/pdf-epub/", icon: "book" },
    { name: "PDF Düzenle", desc: "Sayfaları birleştir, sırala ve döndür", url: "/belge/pdf/", icon: "file" },
    { name: "Metni Kopyala", desc: "Görselden Türkçe metin çıkar", url: "/belge/ocr/", icon: "scan" },
  ] },
  { id: "kod", name: "QR ve Barkod", apps: [
    { name: "QR Kod", desc: "Wi-Fi, IBAN ve kartvizit için QR oluştur", url: "/qr/", icon: "qr" },
    { name: "QR Oku", desc: "Ekran görüntüsündeki QR kodu çöz", url: "/qr/oku/", icon: "scan" },
    { name: "Barkod Oluştur", desc: "Code 128 ve EAN‑13 üret", url: "/qr/barkod/", icon: "file" },
  ] },
];
