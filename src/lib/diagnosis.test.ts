import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  aggregate,
  dissociationBand,
  isCompleteAnswers,
  MIN_GROUP_SIZE,
  rsesFromFivePoint,
  scoreTest,
  SELF_ESTEEM_REFERENCES,
  TESTS,
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

  it("研究の平均を5件法から4件法の40点満点に戻す", () => {
    assert.equal(rsesFromFivePoint(3), 2.5);
    assert.equal(rsesFromFivePoint(5), 4);
    assert.equal(rsesFromFivePoint(1), 1);
    assert.deepEqual(
      SELF_ESTEEM_REFERENCES.map((reference) => Number(reference.value.toFixed(1))),
      [24.1, 25.6, 27.1, 27.8],
    );
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

  it("点数に応じた区分を返す", () => {
    assert.equal(dissociationBand(0).label, "一般的な範囲");
    assert.equal(dissociationBand(11.9).label, "一般的な範囲");
    assert.equal(dissociationBand(12).label, "やや多め");
    assert.equal(dissociationBand(29.9).label, "多め");
    assert.equal(dissociationBand(30).label, "かなり多い");
    assert.equal(dissociationBand(45).label, "非常に多い");
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
  const entry = (age: StatEntry["age"], total: number): StatEntry => ({
    age,
    scores: { total, amnesia: 0, depersonalization: 0, absorption: 0 },
    at: "2026-10-06T00:00:00.000Z",
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
});
