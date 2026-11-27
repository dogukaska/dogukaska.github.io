import { CALCULATORS } from "./catalog.js?v=1";
import { ageAt, clockDuration, datesBetween, shiftDate, turkeyToday } from "./calendar.js?v=1";
import {
  changeAmount, changeRate, comparePrices, fuelCost, money, number, originalAmount,
  percentage, proportion, splitBill, vat,
} from "./amounts.js?v=1";

const int = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 });
const numeric = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 6 });
const date = new Intl.DateTimeFormat("tr-TR", { dateStyle: "long", timeZone: "UTC" });
const dateLabel = (value) => date.format(new Date(value + "T00:00:00Z"));

function fixed(value, digits) {
  const divisor = 10n ** BigInt(digits);
  return int.format(value / divisor) + "," + (value % divisor).toString().padStart(digits, "0");
}

function num(value) {
  if (!Number.isFinite(value)) throw new RangeError("Sonuç hesaplanabilir aralığın dışında.");
  return numeric.format(value);
}

const tl = (value) => fixed(value, 2) + " TL";
const percent = (value) => (value < 0 ? "-%" : "%") + num(Math.abs(value));

const field = (name, label, placeholder) => ({ name, label, placeholder });
const calendarField = (name, label, initial) => ({ name, label, type: "date", initial });
const timeField = (name, label) => ({ name, label, type: "time" });
const integer = (name, label, initial) => ({ name, label, kind: "integer", initial });
const select = (name, label, options) => ({ name, label, type: "select", options });
const row = (label, value) => ({ label, value });

function priceTool(id, direction) {
  const isIncrease = direction === 1;
  const noun = isIncrease ? "Zam" : "İndirim";
  const old = isIncrease ? "Eski tutar" : "Etiket fiyatı";
  const current = isIncrease ? "Yeni tutar" : "İndirimli fiyat";
  const amount = isIncrease ? "Zam tutarı" : "İndirim tutarı";
  const ratio = noun + " oranı (%)";
  return {
    id,
    modes: [
      {
        id: "amount", label: current + " hesapla",
        fields: [field("old", old + " (TL)", "1.234,50"), field("percent", ratio, "10")],
        calculate(values) {
          const result = changeAmount(money(values.old), values.percent, direction);
          return [row(current, tl(result.total)), row(amount, tl(result.difference))];
        },
      },
      {
        id: "ratio", label: noun + " oranını bul",
        fields: [field("old", old + " (TL)"), field("current", current + " (TL)")],
        calculate(values) {
          const result = changeRate(money(values.old), money(values.current), direction);
          return [row(noun + " oranı", percent(result.percent)), row(amount, tl(result.difference))];
        },
      },
      {
        id: "original", label: isIncrease ? "Eski tutarı bul" : "Etiket fiyatını bul",
        fields: [field("current", current + " (TL)"), field("percent", ratio)],
        calculate(values) {
          return [row(old, tl(originalAmount(money(values.current), values.percent, direction)))];
        },
      },
    ],
  };
}

const vatResult = (result) => [
  row("KDV hariç", tl(result.net)),
  row("KDV tutarı", tl(result.tax)),
  row("KDV dahil", tl(result.gross)),
];

const unitLabels = { adet: "adet", kg: "kg", l: "L", m: "m" };

const definitions = [
  priceTool("zam", 1),
  priceTool("indirim", -1),
  {
    id: "yas",
    fields: [calendarField("birth", "Doğum tarihi"), calendarField("asOf", "Hesaplama tarihi", turkeyToday)],
    note: "29 Şubat doğumlular için artık olmayan yıllarda 1 Mart esas alınır.",
    calculate(values) {
      const result = ageAt(values.birth, values.asOf);
      const details = [
        row("Yaş", `${result.years} yıl, ${result.months} ay, ${result.days} gün`),
        row("Toplam", int.format(result.totalDays) + " gün"),
      ];
      if (result.nextBirthday !== null) {
        details.push(row("Sonraki doğum günü", dateLabel(result.nextBirthday)));
        details.push(row("Kalan süre", result.daysToBirthday === 0 ? "Bugün" : result.daysToBirthday + " gün"));
      }
      return details;
    },
  },
  {
    id: "yuzde",
    modes: [
      {
        id: "part", label: "Bir sayının yüzdesini bul",
        fields: [field("a", "Sayı"), field("b", "Yüzde (%)")],
        calculate: (values) => [row("Sonuç", num(percentage("part", number(values.a), number(values.b))))],
      },
      {
        id: "ratio", label: "Bir parça bütünün yüzde kaçı?",
        fields: [field("a", "Parça"), field("b", "Bütün")],
        calculate: (values) => [row("Yüzde", percent(percentage("ratio", number(values.a), number(values.b))))],
      },
      {
        id: "change", label: "Yüzde değişimini bul",
        fields: [field("a", "Başlangıç değeri"), field("b", "Son değer")],
        note: "Değişim, başlangıç değerinin mutlak büyüklüğüne göre hesaplanır.",
        calculate: (values) => [row("Değişim", percent(percentage("change", number(values.a), number(values.b))))],
      },
    ],
  },
  {
    id: "kdv",
    modes: [
      ["net", "KDV hariç tutardan", "KDV hariç tutar (TL)"],
      ["gross", "KDV dahil tutardan", "KDV dahil tutar (TL)"],
      ["tax", "KDV tutarından", "KDV tutarı (TL)"],
    ].map(([id, label, amount]) => ({
      id, label, fields: [field("amount", amount), { ...field("percent", "KDV oranı (%)", "20"), initial: "20" }],
      calculate: (values) => vatResult(vat(money(values.amount), values.percent, id)),
    })),
  },
  {
    id: "gun-farki",
    fields: [
      calendarField("start", "Başlangıç tarihi"), calendarField("end", "Bitiş tarihi"),
      { name: "include", label: "Bitiş gününü de say", type: "checkbox" },
    ],
    note: "Hafta içi sayısı pazartesi ile cuma arasını kapsar. Resmî tatiller ayrıca çıkarılmaz.",
    calculate(values) {
      const result = datesBetween(values.start, values.end, Boolean(values.include));
      return [
        row("Toplam gün", int.format(result.days)),
        row("Hafta ve gün", `${int.format(result.weeks)} hafta, ${result.remainderDays} gün`),
        row("Hafta içi", int.format(result.weekdays) + " gün"),
      ];
    },
  },
  {
    id: "tarih-ekle",
    fields: [calendarField("start", "Başlangıç tarihi", turkeyToday), integer("days", "Gün sayısı")],
    note: "Geriye gitmek için gün sayısını eksi işaretiyle gir.",
    calculate(values) {
      const days = number(values.days);
      if (!Number.isSafeInteger(days)) throw new RangeError("Gün sayısını tam sayı gir.");
      return [row("Yeni tarih", dateLabel(shiftDate(values.start, days)))];
    },
  },
  {
    id: "saat-farki",
    fields: [timeField("start", "Başlangıç saati"), timeField("end", "Bitiş saati")],
    note: "Bitiş saati daha erkense ertesi gün kabul edilir.",
    calculate(values) {
      const result = clockDuration(values.start, values.end);
      const details = [row("Süre", `${result.hours} saat, ${result.minutes} dakika`),
        row("Toplam dakika", int.format(result.totalMinutes))];
      if (result.nextDay) details.push(row("Bitiş", "Ertesi gün"));
      return details;
    },
  },
  {
    id: "birim-fiyat",
    fields: [
      select("unit", "Miktar birimi", Object.entries(unitLabels)),
      field("priceA", "1. ürünün fiyatı (TL)"), field("quantityA", "1. ürünün miktarı"),
      field("priceB", "2. ürünün fiyatı (TL)"), field("quantityB", "2. ürünün miktarı"),
    ],
    note: "İki miktarı da aynı birimde gir. 750 gram için kg seçip 0,75 yazabilirsin.",
    calculate(values) {
      const result = comparePrices(money(values.priceA), values.quantityA, money(values.priceB), values.quantityB);
      const suffix = " TL / " + unitLabels[values.unit];
      return [
        row("1. ürün", fixed(result.first, 4) + suffix),
        row("2. ürün", fixed(result.second, 4) + suffix),
        row("Karşılaştırma", result.cheaper ? result.cheaper + ". ürün daha uygun" : "Birim fiyatlar eşit"),
      ];
    },
  },
  {
    id: "yakit",
    fields: [
      field("distance", "Mesafe (km)"), field("consumption", "Ortalama tüketim (L/100 km)", "6,5"),
      field("price", "Litre fiyatı (TL)"),
    ],
    calculate(values) {
      const result = fuelCost(values.distance, values.consumption, money(values.price));
      return [
        row("Yakıt maliyeti", tl(result.total)),
        row("Yakıt miktarı", num(result.litres) + " L"),
        row("Kilometre başına", fixed(result.perKm, 4) + " TL"),
      ];
    },
  },
  {
    id: "hesap-bolus",
    fields: [field("amount", "Hesap tutarı (TL)"), { ...field("tip", "Bahşiş (%)"), initial: "0" },
      integer("people", "Kişi sayısı", "2")],
    calculate(values) {
      const people = number(values.people);
      const result = splitBill(money(values.amount), values.tip, people);
      const details = [row("Toplam", tl(result.total)), row("Bahşiş", tl(result.tip))];
      if (result.extraPeople) {
        details.push(row("Kişi başı dağılım", `${result.extraPeople} kişi ${tl(result.baseShare + 1n)}, ${people - result.extraPeople} kişi ${tl(result.baseShare)}`));
      } else {
        details.push(row("Kişi başı", tl(result.baseShare)));
      }
      return details;
    },
  },
  {
    id: "oran",
    fields: [field("a", "İlk miktar"), field("b", "İlk miktarın karşılığı"),
      field("c", "Yeni miktar")],
    calculate: (values) => [row("Yeni miktarın karşılığı", num(proportion(number(values.a), number(values.b), number(values.c))))],
  },
];

export const tools = CALCULATORS.map((entry) => ({ ...entry, ...definitions.find((tool) => tool.id === entry.id) }));
