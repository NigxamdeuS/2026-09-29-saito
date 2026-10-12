import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AXES, BIPOLARS, COMBOS, FACETS, PAIRS, TRAITS } from "@/lib/mbti/content";
import {
  BASE_ITEMS,
  baseItemsOf,
  itemsOf,
  MODES,
  STATE_ITEMS,
  type AnswerValue,
  type Item,
} from "@/lib/mbti/items";
import { buildReport } from "@/lib/mbti/report";
import { scoreAll, scoreItems, sceneGaps, typeOf, type Answers } from "@/lib/mbti/scoring";
import { compareProfiles, decodeProfile, encodeProfile, scoresOf } from "@/lib/mbti/share";
import { sanitizeMbti } from "@/lib/mbti/storage";

/** 高い側（軸では右の文字）に寄せた回答なら toward=1、低い側なら 0。 */
function lean(items: Item[], toward: 0 | 1, answers: Answers = {}) {
  for (const item of items) {
    const agree = (item.direction === 1) === (toward === 1);
    answers[item.id] = { value: agree ? 5 : 1, version: item.version };
  }
  return answers;
}

function all(value: AnswerValue): Answers {
  return Object.fromEntries(BASE_ITEMS.map((item) => [item.id, { value, version: item.version }]));
}

describe("質問の構成", () => {
  it("段階ごとの問題数は30・60・90・162で、短い段階の質問は長い段階にすべて含まれる", () => {
    assert.deepEqual(
      MODES.map((mode) => baseItemsOf(mode.key).length),
      [30, 60, 90, 162],
    );
    for (const [i, mode] of MODES.entries()) {
      if (i === 0) continue;
      const longer = new Set(baseItemsOf(mode.key));
      assert.ok(baseItemsOf(MODES[i - 1].key).every((item) => longer.has(item)), mode.key);
    }
  });

  it("どの段階でも、各軸は両方向の質問が同じ数で、複数の場面から聞く", () => {
    for (const mode of MODES) {
      for (const axis of AXES) {
        const items = itemsOf(axis.key, mode.key);
        assert.equal(items.filter((item) => item.direction === 1).length * 2, items.length, `${mode.key} ${axis.key}`);
        assert.ok(new Set(items.map((item) => item.scene)).size >= 3, `${mode.key} ${axis.key}`);
      }
    }
  });

  it("完全版では、各軸の3つの側面にそれぞれ両方向4問ずつある", () => {
    for (const axis of AXES) {
      for (const facet of FACETS[axis.key]) {
        const items = itemsOf(axis.key).filter((item) => item.facet === facet.key);
        assert.equal(items.length, 8, `${axis.key} ${facet.key}`);
        assert.equal(items.filter((item) => item.direction === 1).length, 4, `${axis.key} ${facet.key}`);
      }
      assert.ok(itemsOf(axis.key).every((item) => FACETS[axis.key].some((facet) => facet.key === item.facet)));
    }
  });

  it("スタンダード以上では関わり方の9項目をすべて測る", () => {
    for (const trait of TRAITS) assert.ok(itemsOf(trait.key, "standard").length >= 3, trait.key);
    assert.equal(itemsOf("conversation", "quick").length, 0);
  });

  it("対人傾向の各項目は逆転項目を含み、恋愛の場面だけに頼らない", () => {
    for (const trait of TRAITS) {
      const items = itemsOf(trait.key);
      assert.ok(items.some((item) => item.direction === -1), trait.key);
      assert.ok(items.some((item) => item.scene !== "close"), trait.key);
    }
  });

  it("IDは重複せず、いまの状態の質問は基本診断と別", () => {
    const ids = [...BASE_ITEMS, ...STATE_ITEMS].map((item) => item.id);
    assert.equal(new Set(ids).size, ids.length);
    assert.equal(STATE_ITEMS.length, 4);
    assert.ok(STATE_ITEMS.every((item) => !BASE_ITEMS.includes(item)));
  });
});

describe("採点", () => {
  it("逆転項目を戻して0〜100に換算する", () => {
    const ei = itemsOf("EI");
    assert.equal(scoreAll(lean(ei, 1)).EI.score, 100);
    assert.equal(scoreAll(lean(ei, 0)).EI.score, 0);
    assert.equal(scoreAll(all(5)).EI.score, 50);
  });

  it("「判断できない」は中間と区別して採点から外す", () => {
    const ei = itemsOf("EI");
    const answers = lean(ei, 1);
    answers[ei[0].id] = { value: "na", version: 1 };
    const result = scoreItems(ei, answers);
    assert.equal(result.score, 100);
    assert.equal(result.na, 1);
    assert.equal(result.answered, ei.length - 1);
  });

  it("回答が6割に満たない項目は保留にする", () => {
    const ei = itemsOf("EI");
    const required = Math.ceil(ei.length * 0.6);
    const answers = lean(ei.slice(0, required - 1), 1);
    assert.equal(scoreItems(ei, answers).score, null);
    lean(ei.slice(required - 1, required), 1, answers);
    assert.notEqual(scoreItems(ei, answers).score, null);
  });

  it("段階に含まれない質問は採点に使わず、その段階で出題しない項目は未測定にする", () => {
    const answers = lean(itemsOf("EI"), 1);
    for (const item of itemsOf("EI", "quick")) answers[item.id] = { value: 3, version: item.version };
    assert.equal(scoreAll(answers, "quick").EI.score, 50);
    assert.equal(scoreAll(answers, "quick").EI.total, 6);
    const report = buildReport(answers, "quick");
    assert.equal(report.results.conversation.total, 0);
    assert.ok(report.unmeasured.includes(TRAITS[0].title));
    assert.ok(!report.held.includes(TRAITS[0].title));
    assert.deepEqual(report.facets, []);
  });

  it("版が変わった質問の古い回答は使わない", () => {
    const item = itemsOf("conversation")[0];
    assert.equal(scoreItems([item], { [item.id]: { value: 5, version: item.version + 1 } }).score, null);
  });
});

describe("タイプと境界", () => {
  it("はっきりした軸からタイプを作る", () => {
    const answers: Answers = {};
    lean(itemsOf("EI"), 0, answers);
    lean(itemsOf("SN"), 1, answers);
    lean(itemsOf("TF"), 0, answers);
    lean(itemsOf("JP"), 1, answers);
    const type = typeOf(scoreAll(answers));
    assert.equal(type.type, "ENTP");
    assert.deepEqual(type.candidates, []);
  });

  it("中央付近の軸は、反対にした候補タイプを示す", () => {
    const answers: Answers = {};
    lean(itemsOf("EI"), 0, answers);
    lean(itemsOf("SN"), 1, answers);
    lean(itemsOf("TF"), 0, answers);
    const jp = itemsOf("JP");
    lean(jp.slice(0, 13), 1, answers);
    lean(jp.slice(13), 0, answers);
    const results = scoreAll(answers);
    assert.ok(results.JP.score! >= 40 && results.JP.score! <= 60);
    const type = typeOf(results);
    assert.ok(type.candidates.some((candidate) => candidate.axis === "JP"));
  });

  it("50ちょうどの軸があればタイプを決めない", () => {
    const type = typeOf(scoreAll(all(3)));
    assert.equal(type.type, null);
    assert.ok(type.candidates.length > 0);
  });

  it("保留の軸があれば候補も出さない", () => {
    const type = typeOf(scoreAll({}));
    assert.equal(type.type, null);
    assert.equal(type.heldAxes.length, 4);
    assert.deepEqual(type.candidates, []);
  });
});

describe("場面による違い", () => {
  it("職場と友人で向きが大きく違えば、場面の違いとして取り出す", () => {
    const ei = itemsOf("EI");
    const answers: Answers = {};
    lean(ei.filter((item) => item.scene === "work"), 1, answers);
    lean(ei.filter((item) => item.scene === "friends"), 0, answers);
    const gaps = sceneGaps(["EI"], answers);
    assert.equal(gaps.length, 1);
    assert.equal(gaps[0].high, "work");
    assert.equal(gaps[0].low, "friends");
  });
});

describe("結果の文章", () => {
  it("同じ回答からは常に同じ結果を作る", () => {
    const answers = lean(itemsOf("alone"), 1, lean(itemsOf("contact"), 1));
    assert.deepEqual(buildReport(answers), buildReport(structuredClone(answers)));
  });

  it("特徴の組み合わせは条件がそろったときだけ出す", () => {
    const answers = lean(itemsOf("alone"), 1, lean(itemsOf("contact"), 1));
    const rule = COMBOS.find((combo) => combo.id === "space-but-contact")!;
    const report = buildReport(answers);
    assert.ok(report.combos.some((combo) => combo.text === rule.text));
    assert.ok(report.combos.every((combo) => combo.basis.length > 0));
    assert.equal(buildReport({}).combos.length, 0);
  });

  it("説明ルールはすべての項目に両側の文章がある", () => {
    for (const def of BIPOLARS) {
      for (const pole of [def.low, def.high]) {
        for (const text of Object.values(pole)) assert.ok(text.length > 0, def.key);
        assert.equal(pole.stress === undefined, pole.recover === undefined, def.key);
      }
    }
    for (const axis of AXES) assert.ok(axis.low.stress && axis.high.stress, axis.key);
  });

  it("2つの軸の組み合わせは、中央付近の軸があれば両方のスタイルを示す", () => {
    const answers: Answers = {};
    lean(itemsOf("EI"), 0, answers);
    lean(itemsOf("SN"), 1, answers);
    lean(itemsOf("TF"), 0, answers);
    lean(itemsOf("JP"), 1, answers);
    const titles = buildReport(answers).pairs.map((pair) => pair.styles.map((style) => style.title));
    assert.deepEqual(
      titles.map((group) => group.length),
      [1, 1, 1],
    );
    assert.equal(titles[0][0], PAIRS[0].styles.NT.title);

    const jp = itemsOf("JP");
    lean(jp.slice(0, 13), 1, answers);
    lean(jp.slice(13), 0, answers);
    const mixed = buildReport(answers).pairs.find((pair) => pair.title === PAIRS[1].title)!;
    assert.equal(mixed.styles.length, 2);
    assert.equal(buildReport({}).pairs.length, 0);
  });

  it("軸のスコアにつながった回答を、寄っている側から示す", () => {
    const row = buildReport(lean(itemsOf("EI"), 1)).axes.find((axis) => axis.def.key === "EI")!;
    assert.equal(row.evidence.length, 3);
    assert.ok(row.evidence.every((item) => item.toward === "I"));
    assert.equal(row.degree, "とてもはっきり");
  });
});

describe("回答の状況", () => {
  it("偏りのない回答には注意を出さない", () => {
    const answers: Answers = {};
    for (const axis of AXES) lean(itemsOf(axis.key), 1, answers);
    for (const trait of TRAITS) lean(itemsOf(trait.key), 0, answers);
    assert.deepEqual(buildReport(answers).quality.notes, []);
  });

  it("どれにも「当てはまる」や「どちらともいえない」が多いときは注意を出す", () => {
    const agree = buildReport(all(5)).quality;
    assert.ok(agree.notes.some((note) => note.text.includes("「当てはまる」側")));
    assert.ok(agree.notes.some((note) => note.text.includes("向きがそろっていません")));
    const neutral = buildReport(all(3)).quality;
    assert.equal(neutral.neutral, BASE_ITEMS.length);
    assert.ok(neutral.notes.some((note) => note.text.includes("どちらともいえない")));
    assert.ok(buildReport(all("na")).quality.notes.some((note) => note.text.includes("判断できない")));
  });
});

describe("側面の分析", () => {
  it("完全版でのみ、側面ごとの向きの違いを取り出す", () => {
    const answers: Answers = {};
    const ei = itemsOf("EI");
    lean(ei.filter((item) => item.facet === "recharge"), 1, answers);
    lean(ei.filter((item) => item.facet !== "recharge"), 0, answers);
    const facet = buildReport(answers).facets.find((item) => item.axis.key === "EI")!;
    assert.equal(facet.rows.find((row) => row.def.key === "recharge")!.side, "high");
    assert.equal(facet.rows.find((row) => row.def.key === "process")!.side, "low");
    assert.ok(facet.note.text.includes("側面によって向きが分かれています"));
    assert.deepEqual(buildReport(answers, "detailed").facets, []);
  });
});

describe("共有と二人の比較", () => {
  it("共有コードは点数だけを持ち、元に戻せる", () => {
    const results = scoreAll(lean(itemsOf("EI"), 1));
    const code = encodeProfile("さくら", scoresOf(results));
    const profile = decodeProfile(code)!;
    assert.equal(profile.name, "さくら");
    assert.equal(profile.scores.EI, 100);
    assert.equal(profile.scores.SN, null);
    assert.ok(!code.includes("EI-01"));
  });

  it("壊れたコードは受け付けない", () => {
    assert.equal(decodeProfile("abc"), null);
    assert.equal(decodeProfile("NGX1-!!!"), null);
    const forged = "NGX1-" + btoa(JSON.stringify({ v: 1, n: "", s: [999] }));
    assert.equal(decodeProfile(forged), null);
  });

  it("同じ結果どうしなら違いは出ず、違いは話し合う点として示す", () => {
    const mine = scoresOf(scoreAll(lean(itemsOf("contact"), 1)));
    const same = compareProfiles(mine, mine, "相手");
    assert.ok(same.topics.every((topic) => topic.talks.length === 0));

    const theirs = scoresOf(scoreAll(lean(itemsOf("contact"), 0)));
    const diff = compareProfiles(mine, theirs, "ゆう");
    const topic = diff.topics.find((item) => item.label === "会話と連絡の好み")!;
    assert.ok(topic.differences.some((text) => text.includes("ゆう")));
    assert.ok(diff.adjustments.length > 0);
  });
});

describe("保存データ", () => {
  it("知らない質問・不正な値・古い版は捨てる", () => {
    const progress = sanitizeMbti({
      answers: {
        "EI-01": { value: 5, version: 1 },
        "EI-02": { value: 7, version: 1 },
        "EI-03": { value: "na", version: 1 },
        "EI-04": { value: 3, version: 0 },
        "XX-99": { value: 3, version: 1 },
      },
      stateDone: true,
    });
    assert.deepEqual(Object.keys(progress.answers).sort(), ["EI-01", "EI-03"]);
    assert.equal(progress.stateDone, true);
    assert.equal(progress.mode, "detailed");
    assert.equal(sanitizeMbti({ mode: "quick", answers: {} }).mode, "quick");
    assert.equal(sanitizeMbti({ mode: "zzz", answers: {} }).mode, null);
  });
});
