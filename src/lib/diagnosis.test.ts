import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  aggregate,
  dissociationFrequency,
  isCompleteAnswers,
  MIN_GROUP_SIZE,
  scoreTest,
  TESTS,
  WORDING_VERSION,
  type StatEntry,
} from "@/lib/diagnosis";
import { emptyProgress, sanitizeProgress } from "@/lib/diagnosis-storage";

const confidenceLength = TESTS.confidence.items.length;
const dissociationLength = TESTS.dissociation.items.length;

describe("自信度診断", () => {
  it("自尊感情10問と8分野×3問からなる", () => {
    assert.equal(confidenceLength, 34);
    assert.equal(TESTS.confidence.items.filter((item) => item.reverse).length, 5);
  });

  it("逆転項目を戻して10〜40点で数える", () => {
    const allAgree = Array(confidenceLength).fill(4);
    assert.equal(scoreTest("confidence", allAgree).selfEsteem, 25);

    const best = TESTS.confidence.items.map((item) => (item.reverse ? 1 : 4));
    assert.equal(scoreTest("confidence", best).selfEsteem, 40);

    const worst = TESTS.confidence.items.map((item) => (item.reverse ? 4 : 1));
    assert.equal(scoreTest("confidence", worst).selfEsteem, 10);
  });

  it("分野ごとの自信は3問の平均", () => {
    const answers = Array(confidenceLength).fill(1);
    answers[10] = 4;
    answers[11] = 4;
    answers[12] = 1;
    const scores = scoreTest("confidence", answers);
    assert.equal(scores.work, 3);
    assert.equal(scores.people, 1);
  });

  it("自己効力感の尺度ではないことを説明に含む", () => {
    assert.ok(TESTS.confidence.instructions.some((line) => line.includes("自己効力感")));
    assert.ok(TESTS.confidence.instructions.some((line) => line.includes("平均値や検証結果はそのまま使いません")));
  });
});

describe("解離傾向チェック", () => {
  it("28問の平均を0〜100で数え、下位尺度は6問ずつ", () => {
    assert.equal(dissociationLength, 28);
    const answers = Array(dissociationLength).fill(0);
    for (const number of [3, 4, 5, 8, 25, 26]) answers[number - 1] = 60;
    const scores = scoreTest("dissociation", answers);
    assert.equal(scores.amnesia, 60);
    assert.equal(scores.depersonalization, 0);
    assert.ok(Math.abs(scores.total - (60 * 6) / 28) < 1e-9);
  });

  it("回答の頻度として説明し、原典の臨床区分は使わない", () => {
    assert.equal(dissociationFrequency(0).label, "ほとんどないと回答");
    assert.equal(dissociationFrequency(9.9).label, "たまにすると回答");
    assert.equal(dissociationFrequency(10).label, "ある程度すると回答");
    assert.equal(dissociationFrequency(25).label, "多めにすると回答");
    assert.ok(!dissociationFrequency(45).text.includes("二重人格である確率"));
  });
});

describe("回答の検証", () => {
  it("数・選択肢が合わない回答は受け付けない", () => {
    assert.ok(isCompleteAnswers("confidence", Array(confidenceLength).fill(3)));
    assert.ok(!isCompleteAnswers("confidence", Array(confidenceLength - 1).fill(3)));
    assert.ok(!isCompleteAnswers("confidence", Array(confidenceLength).fill(5)));
    assert.ok(isCompleteAnswers("dissociation", Array(dissociationLength).fill(70)));
    assert.ok(!isCompleteAnswers("dissociation", Array(dissociationLength).fill(15)));
  });

  it("保存データの不正な値は未回答に戻す", () => {
    const progress = sanitizeProgress("confidence", {
      age: "20s",
      share: false,
      answers: [4, 9, "3"],
      submissionId: "../../etc",
    });
    assert.equal(progress.age, "20s");
    assert.equal(progress.share, false);
    assert.equal(progress.answers.length, confidenceLength);
    assert.deepEqual(progress.answers.slice(0, 3), [4, null, null]);
    assert.equal(progress.submissionId, null);
    assert.deepEqual(sanitizeProgress("dissociation", null), emptyProgress("dissociation"));
  });
});

describe("このサイトの平均", () => {
  const entry = (age: StatEntry["age"], total: number, wording = WORDING_VERSION): StatEntry => ({
    age,
    scores: { total, amnesia: 0, depersonalization: 0, absorption: 0 },
    at: "2026-10-06T00:00:00.000Z",
    wording,
  });

  it(`${MIN_GROUP_SIZE}人未満の年代は平均を出さない`, () => {
    const entries = [
      ...Array.from({ length: MIN_GROUP_SIZE }, (_, i) => entry("20s", i * 10)),
      entry("30s", 50),
      entry("none", 100),
    ];
    const stats = aggregate("dissociation", entries);
    assert.equal(stats.byAge["20s"]?.n, MIN_GROUP_SIZE);
    assert.equal(stats.byAge["20s"]?.means.total, 20);
    assert.equal(stats.byAge["30s"]?.n, 1);
    assert.deepEqual(stats.byAge["30s"]?.means, {});
    assert.equal(stats.all.n, MIN_GROUP_SIZE + 2);
    assert.ok(stats.all.means.total !== undefined);
    assert.equal(stats.byAge.none, undefined);
  });

  it("言い換え前の集計は混ぜない", () => {
    const entries = [
      ...Array.from({ length: MIN_GROUP_SIZE }, () => entry("20s", 10, WORDING_VERSION)),
      ...Array.from({ length: MIN_GROUP_SIZE }, () => entry("20s", 90, 1)),
    ];
    const stats = aggregate("dissociation", entries);
    assert.equal(stats.all.n, MIN_GROUP_SIZE);
    assert.equal(stats.all.means.total, 10);
  });
});
