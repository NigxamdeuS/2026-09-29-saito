import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  answeredCount,
  categorySummaries,
  choiceLabel,
  comparisons,
  emptyJournal,
  heldCount,
  journalText,
  nextRound,
  SESSION_SIZE,
  type Choice,
  type Journal,
} from "@/lib/journal";
import { getQuestion, getQuestionByNumber, QUESTIONS, TOTAL_QUESTIONS } from "@/lib/questions";
import { sanitizeJournal } from "@/lib/storage";

function journalWith(entries: [number, Choice, string?][]): Journal {
  const journal = emptyJournal();
  for (const [number, choice, note = ""] of entries) {
    journal.answers[getQuestionByNumber(number)!.id] = {
      choice,
      note,
      updatedAt: "2026-09-30T00:00:00.000Z",
    };
  }
  return journal;
}

describe("質問集", () => {
  it("1から100まで順に並び、IDが重複しない", () => {
    assert.equal(TOTAL_QUESTIONS, 100);
    assert.deepEqual(
      QUESTIONS.map((question) => question.number),
      Array.from({ length: 100 }, (_, index) => index + 1),
    );
    assert.equal(new Set(QUESTIONS.map((question) => question.id)).size, 100);
  });

  it("どの質問にも場面と3つの選択肢がある", () => {
    for (const question of QUESTIONS) {
      assert.ok(question.category && question.topic && question.situation, question.id);
      assert.equal(question.choices.length, 3);
      assert.ok(question.choices.every((choice) => choice.trim().length > 0), question.id);
    }
  });

  it("条件を変えた質問は91〜100で、比べる相手はそれより前の質問", () => {
    const compared = QUESTIONS.filter((question) => question.compareWith.length > 0);
    assert.deepEqual(
      compared.map((question) => question.number),
      [91, 92, 93, 94, 95, 96, 97, 98, 99, 100],
    );
    for (const question of compared) {
      for (const base of question.compareWith) {
        assert.ok(base < question.number && getQuestionByNumber(base), `${question.number} → ${base}`);
      }
    }
  });
});

describe("回答の記録", () => {
  it("未回答の質問を前から5問ずつ出す", () => {
    assert.deepEqual(nextRound(emptyJournal()), ["q001", "q002", "q003", "q004", "q005"]);
    const journal = journalWith([
      [1, 1],
      [3, "hold"],
    ]);
    assert.deepEqual(nextRound(journal), ["q002", "q004", "q005", "q006", "q007"]);
    assert.equal(nextRound(journal).length, SESSION_SIZE);
  });

  it("保留も回答として数え、別にも数える", () => {
    const journal = journalWith([
      [1, 2],
      [2, "hold"],
      [3, "hold"],
    ]);
    assert.equal(answeredCount(journal), 3);
    assert.equal(heldCount(journal), 2);
    const first = categorySummaries(journal).find(
      (summary) => summary.category === QUESTIONS[0].category,
    );
    assert.ok(first && first.answered >= 1);
  });

  it("選択肢は番号と文で表示し、保留はそのまま表示する", () => {
    const question = getQuestion("q001")!;
    assert.equal(choiceLabel(question, 2), `2　${question.choices[1]}`);
    assert.equal(choiceLabel(question, "hold"), "保留");
  });

  it("条件を変えた質問を元の質問の回答と並べる", () => {
    const journal = journalWith([
      [1, 3],
      [91, 1],
    ]);
    const pair = comparisons(journal).find((item) => item.question.number === 91)!;
    assert.equal(pair.answer?.choice, 1);
    assert.equal(pair.bases[0].question.number, 1);
    assert.equal(pair.bases[0].answer?.choice, 3);
  });

  it("テキストには100問すべてと回答・理由が入る", () => {
    const text = journalText(journalWith([[1, "hold", "条件が足りない"]]));
    assert.ok(text.startsWith("場面で選ぶ100問（3択）"));
    assert.ok(text.includes("第1問／100"));
    assert.ok(text.includes("第100問／100"));
    assert.ok(text.includes("回答：保留\n理由・補足（任意）：条件が足りない"));
  });
});

describe("保存データの読み込み", () => {
  it("知らない質問・不正な回答・古い形式は捨てる", () => {
    assert.deepEqual(sanitizeJournal({ version: 1, answers: {} }), emptyJournal());
    const journal = sanitizeJournal({
      version: 2,
      answers: {
        q001: { choice: 2, note: "理由", updatedAt: "2026-09-30T00:00:00.000Z" },
        q002: { choice: 4, note: "", updatedAt: "2026-09-30T00:00:00.000Z" },
        q999: { choice: 1, note: "", updatedAt: "2026-09-30T00:00:00.000Z" },
        q003: { choice: "hold", updatedAt: "2026-09-30T00:00:00.000Z" },
      },
    });
    assert.deepEqual(Object.keys(journal.answers).sort(), ["q001", "q003"]);
    assert.equal(journal.answers.q003.note, "");
  });
});
