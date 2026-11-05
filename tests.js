"use strict";

/*
 * Tests for the due-date math inside index.html (script#core).
 * Run with: node tests.js
 * No dependencies — uses only node's built-ins.
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
const match = html.match(/<script id="core">([\s\S]*?)<\/script>/);
assert.ok(match, "index.html must contain a <script id=\"core\"> block");
vm.runInThisContext(match[1], { filename: "core.js" });

const S = globalThis.PlantSched;
assert.ok(S, "core must expose globalThis.PlantSched");

let passed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log("ok - " + name);
  } catch (err) {
    failures.push({ name, err });
    console.error("FAIL - " + name);
    console.error("      " + (err && err.message ? err.message : err));
  }
}

/* ---------- parseISO / toISO / validISO ---------- */

test("parseISO builds local dates ignoring time-of-day zeroes", () => {
  const d = S.parseISO("2026-03-07");
  assert.strictEqual(d.getFullYear(), 2026);
  assert.strictEqual(d.getMonth(), 2);
  assert.strictEqual(d.getDate(), 7);
  assert.strictEqual(d.getHours(), 0);
});

test("toISO round-trips parseISO", () => {
  assert.strictEqual(S.toISO(S.parseISO("2026-11-05")), "2026-11-05");
});

test("toISO zero-pads single-digit months and days", () => {
  assert.strictEqual(S.toISO(S.parseISO("2026-01-02")), "2026-01-02");
});

test("validISO rejects malformed strings", () => {
  assert.strictEqual(S.validISO("2026-02-30"), false); // Feb 30 rolls over
  assert.strictEqual(S.validISO(""), false);
  assert.strictEqual(S.validISO("not-a-date"), false);
  assert.strictEqual(S.validISO(null), false);
  assert.strictEqual(S.validISO("2026-11-05"), true);
});

/* ---------- day arithmetic ---------- */

test("addDaysISO stays correct across a month boundary", () => {
  assert.strictEqual(S.addDaysISO("2026-01-30", 3), "2026-02-02");
  assert.strictEqual(S.addDaysISO("2026-03-31", 1), "2026-04-01");
});

test("addDaysISO stays correct across a year boundary", () => {
  assert.strictEqual(S.addDaysISO("2025-12-30", 5), "2026-01-04");
});

test("addDaysISO handles leap-day correctly", () => {
  assert.strictEqual(S.addDaysISO("2028-02-28", 1), "2028-02-29"); // 2028 leap year
  assert.strictEqual(S.addDaysISO("2028-02-29", 1), "2028-03-01");
  assert.strictEqual(S.addDaysISO("2026-02-28", 1), "2026-03-01"); // 2026 not leap
});

test("addDaysISO handles negative offsets (going backwards)", () => {
  assert.strictEqual(S.addDaysISO("2026-03-01", -1), "2026-02-28");
});

test("diffDays is sign-aware", () => {
  assert.strictEqual(S.diffDays("2026-01-01", "2026-01-10"), 9);
  assert.strictEqual(S.diffDays("2026-01-10", "2026-01-01"), -9);
  assert.strictEqual(S.diffDays("2026-01-01", "2026-01-01"), 0);
});

test("diffDays covers DST day (23/25 hour days) as whole days", () => {
  assert.strictEqual(S.diffDays("2026-03-07", "2026-03-09"), 2);
});

/* ---------- month arithmetic (repot intervals) ---------- */

test("addMonthsISO handles year rollover", () => {
  assert.strictEqual(S.addMonthsISO("2026-11-05", 3), "2027-02-05");
});

test("addMonthsISO clamps short months (Jan 31 + 1 month = Feb 28)", () => {
  assert.strictEqual(S.addMonthsISO("2026-01-31", 1), "2026-02-28");
});

test("addMonthsISO clamps to Feb 29 in leap years", () => {
  assert.strictEqual(S.addMonthsISO("2028-01-31", 1), "2028-02-29");
});

/* ---------- vacation stretching ---------- */

test("stretchedInterval scales day intervals by the multiplier", () => {
  assert.strictEqual(S.stretchedInterval(7, "days", 1.5), 11);
  assert.strictEqual(S.stretchedInterval(7, "days", 1), 7);
  assert.strictEqual(S.stretchedInterval(10, "days", 2), 20);
});

test("stretchedInterval scales month intervals and keeps sane results", () => {
  assert.strictEqual(S.stretchedInterval(12, "months", 1.25), 15);
  assert.strictEqual(S.stretchedInterval(12, "months", 3), 36);
  assert.strictEqual(S.stretchedInterval(1, "months", 1.25), 1); // never below 1
});

test("stretchedInterval treats falsy multiplier as normal speed", () => {
  assert.strictEqual(S.stretchedInterval(7, "days", undefined), 7);
  assert.strictEqual(S.stretchedInterval(7, "days", null), 7);
});

test("nextDueISO stretches the due date in vacation mode", () => {
  // 10-day interval, watered 5 days ago -> normally due 5 days from today;
  // at ×2 it lands 15 days after the last-done date instead.
  const base = S.addDaysISO("2026-01-01", 0);
  assert.strictEqual(S.nextDueISO(base, 10, "days", 1), "2026-01-11");
  assert.strictEqual(S.nextDueISO(base, 10, "days", 2), "2026-01-21");
});

test("nextDueISO returns null for missing/invalid last-done dates", () => {
  assert.strictEqual(S.nextDueISO(null, 7, "days", 1), null);
  assert.strictEqual(S.nextDueISO("nope", 7, "days", 1), null);
});

/* ---------- status logic ---------- */

test("statusOf buckets days-left into overdue/today/soon/later", () => {
  assert.strictEqual(S.statusOf(-1), "overdue");
  assert.strictEqual(S.statusOf(-30), "overdue");
  assert.strictEqual(S.statusOf(0), "today");
  assert.strictEqual(S.statusOf(1), "soon");
  assert.strictEqual(S.statusOf(3), "soon");
  assert.strictEqual(S.statusOf(4), "later");
  assert.strictEqual(S.statusOf(400), "later");
});

/* ---------- choreInfo (per-chore due computation) ---------- */

test("choreInfo reports overdue when interval has fully passed", () => {
  // today = 2026-11-05; last done 2026-11-01 with a 3-day interval:
  // due 2026-11-04 -> 1 day overdue.
  const info = S.choreInfo("2026-11-01", 3, "days", 1, "2026-11-05");
  assert.strictEqual(info.status, "overdue");
  assert.strictEqual(info.daysLeft, -1);
  assert.strictEqual(info.due, "2026-11-04");
});

test("choreInfo reports due today when the interval lands on today", () => {
  const info = S.choreInfo("2026-11-01", 4, "days", 1, "2026-11-05");
  assert.strictEqual(info.status, "today");
  assert.strictEqual(info.daysLeft, 0);
});

test("choreInfo reports soon within 3 days and later beyond", () => {
  assert.strictEqual(S.choreInfo("2026-11-01", 5, "days", 1, "2026-11-05").status, "soon"); // due 11-06, 1 day left
  assert.strictEqual(S.choreInfo("2026-11-01", 11, "days", 1, "2026-11-05").status, "later"); // due 11-12, 7 days left
});

test("choreInfo stretches overdue items back into the future in vacation mode", () => {
  // 14-day interval, done 20 days ago: overdue by 6 days normally.
  // ×2 -> due 28 days after last-done = 8 days of breathing room.
  const normal = S.choreInfo("2026-10-16", 14, "days", 1, "2026-11-05");
  const vacation = S.choreInfo("2026-10-16", 14, "days", 2, "2026-11-05");
  assert.strictEqual(normal.status, "overdue");
  assert.strictEqual(vacation.status, "later");
  assert.strictEqual(vacation.daysLeft, 8);
  assert.strictEqual(vacation.stretchedFrom, "2026-10-30"); // normal ×1 due date
});

test("choreInfo keeps the exact due date when the multiplier is 1 in vacation mode", () => {
  const info = S.choreInfo("2026-11-02", 7, "days", 1, "2026-11-05");
  assert.strictEqual(info.stretchedFrom, null);
  assert.strictEqual(info.status, "later");
});

test("choreInfo computes month-based repot dues with stretching", () => {
  const info = S.choreInfo("2026-01-01", 12, "months", 1, "2026-11-05");
  assert.strictEqual(info.due, "2027-01-01");
  assert.strictEqual(info.status, "later");

  const stretched = S.choreInfo("2026-01-01", 12, "months", 3, "2026-11-05");
  assert.strictEqual(stretched.due, "2029-01-01");
});

test("choreInfo returns null when the chore was never done", () => {
  assert.strictEqual(S.choreInfo(null, 7, "days", 1, "2026-11-05"), null);
  assert.strictEqual(S.choreInfo(undefined, 7, "days", 1, "2026-11-05"), null);
});

/* ---------- neededChores (the today-tap list source) ---------- */

const today = "2026-11-05";

function makePlant(overrides) {
  return Object.assign({
    id: "p1",
    name: "Test plant",
    alwaysWater: false,
    waterEvery: 7,
    waterLast: "2026-11-01", // 6-day-old watering on a 7-day cycle -> due today
    fertEvery: 30,
    fertLast: "2026-10-20",
    repotEvery: 12,
    repotLast: "2025-12-15"
  }, overrides || {});
}

test("neededChores lists water as due on its due date", () => {
  // 7-day cycle, last done 2026-10-29 -> due 2026-11-05 = today
  const chores = S.neededChores(makePlant({
    waterLast: "2026-10-29"
  }), { active: false, multiplier: 1 }, today);
  assert.deepStrictEqual(chores.map(c => c.chore), ["water"]);
});

test("neededChores lists overdue fertilize and repot, sorted by urgency", () => {
  const chores = S.neededChores(makePlant({
    fertLast: "2026-09-01",
    repotLast: "2024-01-01",
    waterLast: "2026-11-04" // not due yet
  }), { active: false, multiplier: 1 }, today);
  assert.deepStrictEqual(chores.map(c => c.chore), ["repot", "fert"]);
});

test("neededChores returns nothing when everything was just done", () => {
  const chores = S.neededChores(makePlant({
    waterLast: today, fertLast: today, repotLast: today
  }), { active: false, multiplier: 1 }, today);
  assert.deepStrictEqual(chores, []);
});

test("neededChores stretches an overdue water chore quiet in vacation mode", () => {
  // 7-day cycle, last done 2026-10-20: 16 days elapsed -> overdue at ×1,
  // but 7 * 3 = 21 -> due 2026-11-10, so ×3 makes it "later".
  const notVacation = S.neededChores(makePlant({ waterLast: "2026-10-20" }),
    { active: false, multiplier: 1 }, today);
  assert.strictEqual(notVacation.length, 1);
  assert.strictEqual(notVacation[0].chore, "water");
  assert.strictEqual(notVacation[0].info.status, "overdue");

  const vacation = S.neededChores(makePlant({ waterLast: "2026-10-20" }),
    { active: true, multiplier: 3 }, today);
  assert.ok(!vacation.some(c => c.chore === "water"),
    "stretched to 'later', so water leaves the tap list");
  const info = S.choreInfo("2026-10-20", 7, "days", 3, today);
  assert.strictEqual(info.status, "later");
  assert.strictEqual(info.due, "2026-11-10");
  assert.strictEqual(info.stretchedFrom, "2026-10-27");
});

test("neededChores at ×3 removes an overdue water chore from the tap list", () => {
  // 14-day cycle, last done 2026-10-20: due 2026-11-03 (overdue) at ×1,
  // but 2026-10-20 + 42 = 2026-12-01 at ×3, which is not due-now.
  const atX1 = S.neededChores(makePlant({
    waterEvery: 14, waterLast: "2026-10-20"
  }), { active: false, multiplier: 1 }, today);
  assert.ok(atX1.some(c => c.chore === "water"), "water is overdue at normal pace");

  const atX3 = S.neededChores(makePlant({
    waterEvery: 14, waterLast: "2026-10-20"
  }), { active: true, multiplier: 3 }, today);
  assert.ok(!atX3.some(c => c.chore === "water"), "vacation mode pushes water off the tap list");
});

test("neededChores respects alwaysWater plants having no fixed water chore", () => {
  const chores = S.neededChores(makePlant({
    alwaysWater: true,
    waterLast: "2026-09-01"
  }), { active: false, multiplier: 1 }, today);
  assert.ok(!chores.some(c => c.chore === "water"), "water must not appear");
});

/* ---------- summary ---------- */

console.log("");
if (failures.length) {
  console.error(`${failures.length} test(s) failed out of ${passed + failures.length}`);
  process.exit(1);
}
console.log(`All ${passed} tests passed.`);
