const DAY_MS = 86_400_000;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const CLOCK_TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;
const istanbulDate = new Intl.DateTimeFormat("en", {
  timeZone: "Europe/Istanbul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function utcDate(year, month, day) {
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  return date;
}

function parseDate(value) {
  const match = typeof value === "string" && value.length === 10 && ISO_DATE.exec(value);
  if (!match) throw new RangeError("Geçerli bir tarih seç.");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = utcDate(year, month, day);
  if (year === 0 || date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day) {
    throw new RangeError("Geçerli bir tarih seç.");
  }
  return date;
}

function isoDate(date) {
  const year = date.getUTCFullYear();
  if (!Number.isInteger(year) || year < 1 || year > 9999) {
    throw new RangeError("Sonuç 0001 ile 9999 yılları arasında olmalı.");
  }
  return date.toISOString().slice(0, 10);
}

function daysBetween(start, end) {
  return (end - start) / DAY_MS;
}

function addMonths(date, months) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1 + months;
  const lastDay = utcDate(year, month + 1, 0).getUTCDate();
  return utcDate(year, month, Math.min(date.getUTCDate(), lastDay));
}

export function turkeyToday(now = new Date()) {
  const parts = Object.fromEntries(istanbulDate.formatToParts(now).map(({ type, value }) => [type, value]));
  return `${parts.year.padStart(4, "0")}-${parts.month}-${parts.day}`;
}

export function ageAt(birthISO, comparisonISO) {
  const birth = parseDate(birthISO);
  const comparison = parseDate(comparisonISO);
  if (comparison < birth) throw new RangeError("Hesaplama tarihi doğum tarihinden önce olamaz.");

  const comparisonYear = comparison.getUTCFullYear();
  // UTC date normalization puts a February 29 anniversary on March 1 in a non-leap year.
  const birthdayIn = (year) => utcDate(year, birth.getUTCMonth() + 1, birth.getUTCDate());
  const birthdayThisYear = birthdayIn(comparisonYear);
  const completedYear = birthdayThisYear <= comparison ? comparisonYear : comparisonYear - 1;
  const anniversary = birthdayIn(completedYear);
  const years = completedYear - birth.getUTCFullYear();
  let months = Math.min(11, (comparisonYear - anniversary.getUTCFullYear()) * 12
    + comparison.getUTCMonth() - anniversary.getUTCMonth());
  if (addMonths(anniversary, months) > comparison) months -= 1;
  const days = daysBetween(addMonths(anniversary, months), comparison);

  const nextYear = birthdayThisYear < comparison ? comparisonYear + 1 : comparisonYear;
  const nextBirthday = nextYear <= 9999 ? birthdayIn(nextYear) : null;
  return {
    years,
    months,
    days,
    totalDays: daysBetween(birth, comparison),
    nextBirthday: nextBirthday ? isoDate(nextBirthday) : null,
    daysToBirthday: nextBirthday ? daysBetween(comparison, nextBirthday) : null,
  };
}

export function datesBetween(startISO, endISO, includeStartAndEnd = false) {
  const start = parseDate(startISO);
  const end = parseDate(endISO);
  if (end < start) throw new RangeError("Bitiş tarihi başlangıç tarihinden önce olamaz.");

  const days = daysBetween(start, end) + (includeStartAndEnd ? 1 : 0);
  const weeks = Math.floor(days / 7);
  const remainderDays = days % 7;
  let weekdays = weeks * 5;
  for (let step = 0; step < remainderDays; step += 1) {
    const weekday = (start.getUTCDay() + step) % 7;
    if (weekday >= 1 && weekday <= 5) weekdays += 1;
  }
  return { days, weeks, remainderDays, weekdays };
}

export function shiftDate(value, days) {
  const start = parseDate(value);
  if (!Number.isSafeInteger(days)) throw new RangeError("Gün sayısını tam sayı olarak gir.");
  return isoDate(new Date(start.getTime() + days * DAY_MS));
}

function parseTime(value) {
  const match = typeof value === "string" && value.length === 5 && CLOCK_TIME.exec(value);
  if (!match) throw new RangeError("Geçerli bir saat seç.");
  return Number(match[1]) * 60 + Number(match[2]);
}

export function clockDuration(startHHMM, endHHMM) {
  const difference = parseTime(endHHMM) - parseTime(startHHMM);
  const nextDay = difference < 0;
  const totalMinutes = difference + (nextDay ? 1440 : 0);
  return { hours: Math.floor(totalMinutes / 60), minutes: totalMinutes % 60, totalMinutes, nextDay };
}
