import assert from "node:assert/strict";
import test from "node:test";
import {
  changeAmount, changeRate, comparePrices, fuelCost, money, number, originalAmount,
  percentage, proportion, splitBill, vat,
} from "../../hesaplama/amounts.js";

test("Turkish decimal commas, grouping and precision", () => {
  assert.equal(money("1.234,56"), 123456n);
  assert.equal(money("1.234"), 123400n);
  assert.equal(money("12.50"), 1250n);
  assert.equal(number("−2,5"), -2.5);
  assert.throws(() => money("5,001"), /iki ondalık/);
  assert.throws(() => money("-1"), /negatif/);
  for (const invalid of ["", "11,23,4", "1 00", "NaN", "3e2", "1.2.3"]) assert.throws(() => number(invalid));
});

test("raise and discount forward, reverse and by difference", () => {
  assert.deepEqual(changeAmount(money("50.000"), "20", 1), { total: 6_000_000n, difference: 1_000_000n });
  assert.deepEqual(changeRate(money("40.000"), money("50.000"), 1), { percent: 25, difference: 1_000_000n });
  assert.equal(originalAmount(money("60.000"), "20", 1), money("50.000"));
  assert.deepEqual(changeAmount(money("1.234,56"), "12,5", -1), { total: 108024n, difference: 15432n });
  assert.equal(originalAmount(money("80"), "20", -1), money("100"));
  assert.deepEqual(changeRate(money("100"), money("80"), -1), { percent: 20, difference: 2000n });
  assert.deepEqual(changeAmount(money("50"), "100", -1), { total: 0n, difference: 5000n });
  assert.deepEqual(changeAmount(money("0,05"), "10", -1), { total: 5n, difference: 0n });
  assert.throws(() => originalAmount(0n, "100", -1), /%100/);
  assert.throws(() => changeAmount(100n, "100,01", -1), /%100/);
  assert.throws(() => changeRate(0n, 50n, 1), /sıfır/);
  assert.throws(() => changeRate(100n, 150n, -1), /yüksek/);
});

test("percentages and direct proportions", () => {
  assert.equal(percentage("part", 240, 12.5), 30);
  assert.equal(percentage("ratio", 45, 60), 75);
  assert.equal(percentage("change", 125, 100), -20);
  assert.equal(percentage("change", -100, -50), 50);
  assert.equal(proportion(3, 12, 5), 20);
  assert.throws(() => percentage("ratio", 1, 0), /sıfır/);
  assert.throws(() => proportion(0, 12, 5), /sıfır/);
});

test("VAT results reconcile to the kuruş", () => {
  const expected = { net: 100000n, tax: 20000n, gross: 120000n };
  assert.deepEqual(vat(money("1000"), "20", "net"), expected);
  assert.deepEqual(vat(money("1200"), "20", "gross"), expected);
  assert.deepEqual(vat(money("200"), "20", "tax"), expected);
  assert.deepEqual(vat(money("0,05"), "10", "net"), { net: 5n, tax: 1n, gross: 6n });
  assert.deepEqual(vat(100n, "0", "gross"), { net: 100n, tax: 0n, gross: 100n });
  assert.throws(() => vat(0n, "0", "tax"), /sıfır/);
});

test("unit comparisons, fuel, and splitting to the last kuruş", () => {
  assert.deepEqual(comparePrices(money("89,90"), "0,75", money("120"), "1"),
    { first: 1198667n, second: 1200000n, cheaper: 1 });
  assert.equal(comparePrices(money("90"), "0,75", money("120"), "1").cheaper, 0);
  assert.throws(() => comparePrices(10n, "0", 10n, "1"), /sıfır/);
  assert.deepEqual(fuelCost("350", "6,5", money("44,90")),
    { litres: 22.75, total: 102148n, perKm: 29185n });
  assert.deepEqual(splitBill(money("100"), "10", 3),
    { tip: 1000n, total: 11000n, baseShare: 3666n, extraPeople: 2 });
  assert.throws(() => splitBill(100n, "0", 2.5), /tam sayı/);
});
