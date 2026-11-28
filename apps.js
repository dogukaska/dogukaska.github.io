import { CALCULATORS } from "./hesapkitap/catalog.js?v=2";

// Yeni bir bağımsız aracı ilgili kategoriye ekle. icon, icons.js içindeki simge adı.
export const CATEGORIES = [
  { id: "not", name: "Notlar", apps: [
    { name: "x-notes", desc: "Yerel notlar, kategori profilleri ve yanıtlar", terms: "not defteri günlük giderler metin fikir", url: "/x-notes/", icon: "note" },
  ] },
  { id: "foto", name: "Fotoğraf", apps: [
    { name: "Foto Araçları", desc: "Arka plan sil, dönüştür, sıkıştır", terms: "heic jpg jpeg png webp avif resim format arka plan", url: "/foto/", icon: "image" },
    { name: "Görsel Gizle", desc: "Yüzleri bul ve gizle", terms: "mozaik sansür fotoğraf karart", url: "/foto/gizle/", icon: "image" },
    { name: "Hedef Boyuta Küçült", desc: "KB sınırına indir", terms: "fotoğraf sıkıştır dosya boyutu kb mb", url: "/foto/hedef-boyut/", icon: "image" },
    { name: "Görsele Filigran", desc: "Metin veya logo ekle", terms: "jpg png gif filigran damga", url: "/foto/studyo/?arac=filigran", icon: "image" },
    { name: "Fotoğraf Baskı Boyutu", desc: "Piksel ve santimetre arasında hesapla", terms: "baskı fotoğraf ölçü ppi dpi piksel çözünürlük", url: "/foto/baski-boyutu/", icon: "image" },
    { name: "Fotoğraf Bilgilerini Temizle", desc: "Konum ve cihaz bilgilerini gör veya sil", terms: "exif xmp metadata gps çekim tarihi gizlilik jpg jpeg üstveri", url: "/foto/bilgileri-temizle/", icon: "image" },
    { name: "Fotoğrafları Birleştir", desc: "Yan yana, alt alta veya ızgarada birleştir", terms: "kolaj collage önce sonra karşılaştırma görseller jpg png", url: "/foto/birlestir/", icon: "image" },
  ] },
  { id: "video", name: "Video ve Ses", apps: [
    { name: "Video Araçları", desc: "Ses çıkar, GIF yap", terms: "mp3 wav hareketli resim gif", url: "/video/", icon: "video" },
    { name: "Ses Kırp", desc: "Bir bölümü seç ve MP3 veya WAV indir", terms: "ses kes ses düzenle", url: "/video/ses-kirp/", icon: "scissors" },
    { name: "Sesi Yazıya Çevir", desc: "Türkçe konuşmayı metne çevir", terms: "sesli mesaj konuşma deşifre transkripsiyon mp3 m4a wav mp4 mov webm mkv avi", url: "/video/ses-yaziya/", icon: "file" },
    { name: "Video Düzenle", desc: "Videoyu kırp, sessize al veya MP4 yap", terms: "video kes kırp sessiz sesi kaldır mov mp4 iphone dönüştür", url: "/video/duzenle/", icon: "video" },
  ] },
  { id: "belge", name: "Belge ve Kitap", apps: [
    { name: "Belge Tarayıcı", desc: "Belgeyi tara, düzelt, PDF yap", terms: "kamera tarama pdf kitap", url: "/belge/", icon: "scan" },
    { name: "Kitap Çevirici", desc: "PDF’yi EPUB’a dönüştür", terms: "e kitap e-kitap dönüştür e okuyucu", url: "/pdf-epub/", icon: "book" },
    { name: "PDF Düzenle", desc: "Sayfaları sırala ve döndür", terms: "pdf birleştir pdf ayır sayfa çıkar", url: "/belge/pdf/", icon: "file" },
    { name: "Metni Kopyala", desc: "Görselden metin çıkar", terms: "ocr resimden yazı fotoğraftan metin", url: "/belge/ocr/", icon: "scan" },
    { name: "PDF Küçült", desc: "Dosya boyutunu azalt", terms: "pdf sıkıştır kalite boyut", url: "/belge/pdf-araclari/?arac=kucult", icon: "file" },
    { name: "OCR PDF", desc: "Taramayı aranabilir yap", terms: "pdf ocr türkçe aranabilir seçilebilir metin", url: "/belge/pdf-araclari/?arac=ocr", icon: "scan" },
    { name: "Sayfa Numarası", desc: "PDF’i numaralandır", terms: "pdf sayfa numarası pozisyon boyut", url: "/belge/pdf-araclari/?arac=numara", icon: "file" },
    { name: "PDF Kırp", desc: "Kenarları kırp", terms: "pdf kenar boşluğu kırp sayfa boyutu", url: "/belge/pdf-araclari/?arac=kirp", icon: "scissors" },
    { name: "PDF Formlar", desc: "Form oluştur veya doldur", terms: "pdf form metin kutu onay radyo liste", url: "/belge/pdf-araclari/?arac=form", icon: "file" },
    { name: "PDF Filigran", desc: "Metin veya logo ekle", terms: "pdf filigran metin görsel şeffaflık", url: "/belge/pdf-araclari/?arac=filigran", icon: "file" },
    { name: "PDF İmzala", desc: "İmzanı çiz ve ekle", terms: "pdf imza belge çiz", url: "/belge/pdf-araclari/?arac=imza", icon: "file" },
    { name: "PDF Ayır", desc: "Sayfa aralıklarını ayır", terms: "pdf böl ayıkla sayfa aralığı zip", url: "/belge/pdf-araclari/?arac=ayir", icon: "scissors" },
    { name: "PDF Birleştir", desc: "PDF’leri sıralayıp birleştir", terms: "pdf birleştir sayfa düzenle", url: "/belge/pdf/?arac=birlestir", icon: "file" },
    { name: "PDF’yi Görsele Çevir", desc: "Sayfaları JPG veya PNG olarak indir", terms: "pdf to image jpg png jpeg resim görsel zip dışa aktar sayfa", url: "/belge/gorsele-cevir/", icon: "image" },
  ] },
  { id: "takip", name: "Takip", apps: [
    { name: "Döviz ve Altın Çevirici", desc: "Altın, dolar, euro ve sterlin kurlarını gör, TL karşılığını hesapla", terms: "gram altın usd avro eur gbp alış satış", url: "/doviz/", icon: "exchange" },
  ] },
  { id: "kod", name: "QR ve Barkod", apps: [
    { name: "QR Kod", desc: "Wi-Fi, IBAN ve kartvizit için QR oluştur", terms: "karekod whatsapp telefon konum bağlantı", url: "/qr/", icon: "qr" },
    { name: "QR Oku", desc: "Kameradan veya görselden QR oku", terms: "karekod tara qr okut", url: "/qr/oku/", icon: "scan" },
    { name: "Barkod Oluştur", desc: "Code 128 ve EAN‑13 üret", terms: "ean market ürün barkodu", url: "/qr/barkod/", icon: "file" },
  ] },
  { id: "dosya", name: "Dosya", apps: [
    { name: "Dosya Paylaşımı", desc: "100 MB’a kadar dosyayı bağlantı veya QR ile gönder", terms: "görsel resim fotoğraf pdf zip belge orijinal kalite qr link gönder", url: "/foto/paylas/", icon: "file" },
    { name: "Arşiv Açıcı", desc: "ZIP, RAR ve 7z dosyalarının içini aç", terms: "arşiv sıkıştırma çıkart unzip winrar parola", url: "/dosya/arsiv/", icon: "file" },
    { name: "ZIP Oluştur", desc: "Dosyaları tek arşive topla", terms: "zip sıkıştır paketle arşiv dosyalar arşivleme", url: "/dosya/zip-olustur/", icon: "file" },
    { name: "CSV ↔ Excel", desc: "CSV ve XLSX arasında dönüştür", terms: "excel xlsx csv semicolon noktalı virgül tablo kod barkod", url: "/metin-veri/excel/", icon: "file" },
  ] },
  { id: "hesaplama", name: "Hesaplama", apps: CALCULATORS.map(({ id, ...app }) => ({
    ...app, url: "/hesapkitap/?arac=" + id,
  })) },
  { id: "ev", name: "Ev", apps: [
    { name: "Odaya Sığar mı?", desc: "Mobilya ve kapı ölçüleriyle oda yerleşimini çiz", terms: "oda planı koltuk mobilya boyut yerleşim santimetre", url: "/ev/yerlesim/", icon: "image" },
    { name: "Taşınma Kutusu Bulucu", desc: "Kutuların içini kaydet ve ara", terms: "taşınma koli oda etiket eşya", url: "/ev/araclar/?arac=kutu", icon: "file" },
    { name: "Fiş ve Garanti Arşivi", desc: "Fişleri ve garanti tarihlerini sakla", terms: "garanti servis fatura seri numarası hatırlatma", url: "/ev/araclar/?arac=garanti", icon: "file" },
    { name: "Boya Alış Listesi", desc: "Duvara gereken boya kutularını hesapla", terms: "boya metrekare litre duvar dekorasyon", url: "/ev/araclar/?arac=boya", icon: "file" },
    { name: "Sayaç Okuma Defteri", desc: "Endeks kaydet, tüketimi karşılaştır", terms: "elektrik su doğalgaz sayaç enerji kwh endeks csv", url: "/ev/araclar/?arac=sayac", icon: "file" },
    { name: "Tarif Kartı", desc: "Tarif sakla ve porsiyonu değiştir", terms: "yemek malzeme porsiyon mutfak tarif ölçü", url: "/ev/tarif/", icon: "book" },
    { name: "Metrekare ve Malzeme Adedi", desc: "Zemin alanını ve paket sayısını bul", terms: "metrekare alan fayans seramik parke fire paket", url: "/ev/metrekare/", icon: "file" },
  ] },
  { id: "plan", name: "Planlama", apps: [
    { name: "Vardiyayı Takvime Aktar", desc: "Nöbet döngünü oluştur ve takvim dosyası indir", terms: "vardiya nöbet takvim ics gündüz gece izin", url: "/plan/vardiya/", icon: "file" },
    { name: "İş Günü Hesabı", desc: "Tatile ve hafta sonuna uğramadan tarih bul", terms: "iş günü hafta içi tarih ekle çıkar tatil mesai", url: "/plan/is-gunu/", icon: "note" },
  ] },
];
