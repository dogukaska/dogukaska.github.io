// Yeni bir bağımsız aracı ilgili kategoriye ekle. icon, icons.js içindeki simge adı.
export const CATEGORIES = [
  { id: "foto", name: "Fotoğraf", apps: [
    { name: "Foto Araçları", desc: "Arka plan sil, dönüştür, sıkıştır", url: "/foto/", icon: "image" },
  ] },
  { id: "video", name: "Video ve Ses", apps: [
    { name: "Video Araçları", desc: "Ses çıkar, GIF yap", url: "/video/", icon: "video" },
  ] },
  { id: "belge", name: "Belge ve Kitap", apps: [
    { name: "Belge Tarayıcı", desc: "Belgeyi tara, düzelt, PDF yap", url: "/belge/", icon: "scan" },
    { name: "Kitap Çevirici", desc: "Türkçe PDF’yi EPUB’a dönüştür", url: "/pdf-epub/", icon: "book" },
  ] },
  { id: "kod", name: "QR ve Barkod", apps: [
    { name: "QR Kod", desc: "Wi-Fi, IBAN ve kartvizit için QR oluştur", url: "/qr/", icon: "qr" },
  ] },
];
