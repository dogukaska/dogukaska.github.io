import assert from "node:assert/strict";
import test from "node:test";
import { ageAt, clockDuration, datesBetween, shiftDate, turkeyToday } from "../../hesaplama/calendar.js";

test("age separates completed years, calendar months and actual days", () => {
  assert.deepEqual(ageAt("2000-06-15", "2024-09-24"), {
    years: 24, months: 3, days: 9, totalDays: 8867,
    nextBirthday: "2025-06-15", daysToBirthday: 264,
  });
  assert.deepEqual(ageAt("2024-01-31", "2024-02-29"), {
    years: 0, months: 1, days: 0, totalDays: 29,
    nextBirthday: "2025-01-31", daysToBirthday: 337,
  });
  assert.deepEqual(ageAt("2026-11-27", "2026-11-27"), {
    years: 0, months: 0, days: 0, totalDays: 0,
    nextBirthday: "2026-11-27", daysToBirthday: 0,
  });
  assert.equal(ageAt("9999-01-01", "9999-12-31").nextBirthday, null);
});

test("February 29 birthdays fall on March 1 in common years", () => {
  assert.deepEqual(ageAt("2000-02-29", "2026-02-28"), {
    years: 25, months: 11, days: 27, totalDays: 9496,
    nextBirthday: "2026-03-01", daysToBirthday: 1,
  });
  assert.deepEqual(ageAt("2000-02-29", "2026-03-01"), {
    years: 26, months: 0, days: 0, totalDays: 9497,
    nextBirthday: "2026-03-01", daysToBirthday: 0,
  });
  const beforeAnniversary = ageAt("2020-02-29", "2025-02-28");
  assert.equal(beforeAnniversary.years, 4);
  assert.equal(beforeAnniversary.months, 11);
  assert.equal(beforeAnniversary.daysToBirthday, 1);
  assert.equal(ageAt("2020-02-29", "2024-02-28").nextBirthday, "2024-02-29");
  assert.throws(() => ageAt("2025-01-02", "2025-01-01"), /doğum tarihinden önce/);
});

test("date differences count leap days and optionally include the end date", () => {
  assert.deepEqual(datesBetween("2024-02-28", "2024-03-01"), {
    days: 2, weeks: 0, remainderDays: 2, weekdays: 2,
  });
  assert.equal(datesBetween("2023-02-28", "2023-03-01").days, 1);
  assert.deepEqual(datesBetween("2024-03-08", "2024-03-18"), {
    days: 10, weeks: 1, remainderDays: 3, weekdays: 6,
  });
  assert.deepEqual(datesBetween("2024-03-08", "2024-03-18", true), {
    days: 11, weeks: 1, remainderDays: 4, weekdays: 7,
  });
  assert.equal(datesBetween("2024-03-09", "2024-03-09", true).weekdays, 0);
  assert.equal(datesBetween("2024-03-08", "2024-03-08").days, 0);
  assert.equal(datesBetween("2024-03-30", "2024-04-01").days, 2);
  assert.throws(() => datesBetween("2025-01-02", "2025-01-01"), /başlangıç tarihinden önce/);
});

test("shifting dates crosses month, year and Gregorian century boundaries", () => {
  assert.equal(shiftDate("2024-03-01", -1), "2024-02-29");
  assert.equal(shiftDate("2100-02-28", 1), "2100-03-01");
  assert.equal(shiftDate("2000-02-28", 1), "2000-02-29");
  assert.equal(shiftDate("2026-12-30", 5), "2027-01-04");
  assert.equal(shiftDate("0099-12-31", 1), "0100-01-01");
  assert.throws(() => shiftDate("0001-01-01", -1), /0001 ile 9999/);
  assert.throws(() => shiftDate("9999-12-31", 1), /0001 ile 9999/);
  assert.throws(() => shiftDate("2024-01-01", 1.5), /tam sayı/);
  assert.throws(() => shiftDate("2024-01-01", Number.MAX_SAFE_INTEGER + 1), /tam sayı/);
});

test("malformed or impossible civil dates are rejected", () => {
  for (const invalid of ["", "0000-01-01", "2024-00-15", "2024-01-00", "2024-11-31",
    "1900-02-29", "2024-3-05", "2024-03-05\n", "2024-13-01", "10000-01-01", null]) {
    assert.throws(() => shiftDate(invalid, 0), RangeError);
  }
});

test("clock durations handle midnight and validate 24-hour inputs", () => {
  assert.deepEqual(clockDuration("08:15", "17:45"), {
    hours: 9, minutes: 30, totalMinutes: 570, nextDay: false,
  });
  assert.deepEqual(clockDuration("23:40", "01:05"), {
    hours: 1, minutes: 25, totalMinutes: 85, nextDay: true,
  });
  assert.deepEqual(clockDuration("07:00", "07:00"), {
    hours: 0, minutes: 0, totalMinutes: 0, nextDay: false,
  });
  assert.equal(clockDuration("00:01", "00:00").totalMinutes, 1439);
  for (const invalid of ["", "8:00", "24:00", "08:60", "08:00\n", "08:00:00", null]) {
    assert.throws(() => clockDuration(invalid, "10:00"), RangeError);
  }
});

test("today changes at midnight in Turkey, independently of browser timezone", () => {
  assert.equal(turkeyToday(new Date("2026-11-26T20:59:59Z")), "2026-11-26");
  assert.equal(turkeyToday(new Date("2026-11-26T21:00:00Z")), "2026-11-27");
});
