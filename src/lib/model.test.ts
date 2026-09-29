import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  contextOrder,
  emptyJournal,
  familyOrder,
  type ContextId,
  type Journal,
  type Pole,
} from "./catalog";
import { buildModel, predictFor } from "./model";
import {
  displayPoles,
  getQuestion,
  nextRound,
  QUESTION_ORDER,
  retestsDue,
  type Question,
} from "./questions";
import { sanitizeJournal } from "./storage";

function journalFrom(poleFor: (question: Question) => Pole | null): Journal {
  const journal = emptyJournal();
  for (const question of QUESTION_ORDER) {
    const pole = poleFor(question);
    if (!pole) continue;
    journal.answers[question.id] = {
      pole,
      updatedAt: "2026-09-29T00:00:00.000Z",
    };
  }
  return journal;
}

function byContext(context: ContextId): Pole {
  if (context === "work" || context === "public" || context === "money") {
    return "plus";
  }
  return "minus";
}

describe("問いの目録", () => {
  it("100問が家族と場面の組で揃っている", () => {
    assert.equal(QUESTION_ORDER.length, 100);
    const ids = new Set(QUESTION_ORDER.map((question) => question.id));
    assert.equal(ids.size, 100);
    for (const family of familyOrder) {
      for (const context of contextOrder) {
        assert.ok(ids.has(`${family}-${context}`));
      }
    }
  });

  it("選択肢の表示順は三つとも残り、問ごとに安定する", () => {
    for (const question of QUESTION_ORDER) {
      const first = displayPoles(question.id);
      const second = displayPoles(question.id);
      assert.deepEqual(first, second);
      assert.deepEqual([...first].sort(), ["mid", "minus", "plus"]);
    }
  });
});

describe("意思決定モデル", () => {
  it("無回答では可能性を保留する", () => {
    const model = buildModel(emptyJournal());
    assert.equal(model.pattern, "thin");
    assert.equal(model.possibility, "保留");
    assert.equal(model.headline, "まだ、可能性は判断しない");
    assert.equal(model.swaps.length, 0);
    assert.equal(model.selves, null);
  });

  it("材料が薄いあいだは、逆の選択があっても判定しない", () => {
    const model = buildModel(
      journalFrom((question) => {
        if (question.family !== "unfinished") return null;
        return question.context === "work" ? "plus" : "minus";
      }),
    );
    assert.equal(model.answered, 5);
    assert.equal(model.pattern, "thin");
    assert.equal(model.possibility, "保留");
    assert.equal(model.swaps.length, 1);
    assert.equal(model.selves, null);
  });

  it("全部同じ側なら、一つの型で可能性は低い", () => {
    const model = buildModel(journalFrom(() => "plus"));
    assert.equal(model.pattern, "single");
    assert.equal(model.possibility, "低い");
    assert.equal(model.headline, "場面が変わっても、選ぶ側は安定している");
    assert.equal(model.swaps.length, 0);
    assert.ok(model.axes.every((axis) => axis.kind === "single"));
  });

  it("場面が揃って逆を選ぶと、二つの型として可能性は高い", () => {
    const model = buildModel(journalFrom((question) => byContext(question.context)));
    assert.equal(model.answered, 100);
    assert.equal(model.pattern, "dual");
    assert.equal(model.possibility, "高い");
    assert.equal(model.headline, "状況によって、もう一つの判断の型が顔を出す");
    assert.ok(model.axes.every((axis) => axis.kind === "split"));
    assert.match(model.body, /速さは分かれている。仕事・人前・お金では「先に動く」/);
    assert.match(model.body, /親しい人・一人では「置いてから動く」/);
    assert.equal(model.selves?.a.behavior, "先に動く");
    assert.equal(model.selves?.b.behavior, "置いてから動く");
    assert.equal(model.swaps.length, 20);
    assert.match(model.prose, /二重人格の可能性: 高い/);
    assert.match(model.prose, /疾患の診断ではない/);
  });

  it("二つの軸だけが分かれ、24問未満ならありうるにとどめる", () => {
    const model = buildModel(
      journalFrom((question) => {
        if (question.family !== "unfinished" && question.family !== "chase") {
          if (question.family !== "contradict" && question.family !== "air") {
            return null;
          }
        }
        return byContext(question.context);
      }),
    );
    assert.equal(model.answered, 20);
    assert.equal(model.pattern, "splitting");
    assert.equal(model.possibility, "ありうる");
    const tempo = model.axes.find((axis) => axis.axis === "tempo");
    const truth = model.axes.find((axis) => axis.axis === "truth");
    assert.equal(tempo?.kind, "split");
    assert.equal(truth?.kind, "split");
  });

  it("同じ場面の中で逆を選ぶと、二重ではなくばらつきになる", () => {
    const flip = new Set([
      "chase",
      "air",
      "exit",
      "lend",
      "apology",
      "reopen",
      "lead",
      "decline",
      "plan",
      "secret",
    ]);
    const model = buildModel(
      journalFrom((question) => {
        const base = byContext(question.context);
        if (!flip.has(question.family)) return base;
        return base === "plus" ? "minus" : "plus";
      }),
    );
    assert.equal(model.pattern, "noisy");
    assert.equal(model.possibility, "判断しない");
    assert.equal(model.headline, "型になる前のばらつきが先に出ている");
    assert.ok(model.axes.every((axis) => axis.kind !== "split"));
  });

  it("中間ばかりでも、一つの型として中央に残る", () => {
    const model = buildModel(journalFrom(() => "mid"));
    assert.equal(model.pattern, "single");
    assert.ok(
      model.axes.every((axis) => axis.kind === "single" && axis.mean === 0),
    );
  });
});

function withRetests(journal: Journal, same: number, total: number): Journal {
  const ids = Object.keys(journal.answers).slice(0, total);
  journal.retests = ids.map((id, index) => {
    const original = journal.answers[id].pole;
    const flipped: Pole = original === "plus" ? "minus" : "plus";
    return {
      id,
      original,
      pole: index < same ? original : flipped,
      at: "2026-09-29T01:00:00.000Z",
    };
  });
  return journal;
}

describe("確かめと予測", () => {
  it("出し直しで答えが戻らなければ、分かれ方ではなくばらつきと読む", () => {
    const journal = withRetests(
      journalFrom((question) => byContext(question.context)),
      1,
      4,
    );
    const model = buildModel(journal);
    assert.equal(model.consistency.rate, 0.25);
    assert.equal(model.pattern, "noisy");
    assert.equal(model.possibility, "判断しない");
    assert.equal(model.selves, null);
  });

  it("出し直しの一致が半分なら、高いではなくありうるにとどめる", () => {
    const journal = withRetests(
      journalFrom((question) => byContext(question.context)),
      2,
      4,
    );
    const model = buildModel(journal);
    assert.equal(model.pattern, "splitting");
    assert.equal(model.possibility, "ありうる");
  });

  it("出し直しで戻れば、二つの型の判断は保たれる", () => {
    const journal = withRetests(
      journalFrom((question) => byContext(question.context)),
      4,
      4,
    );
    const model = buildModel(journal);
    assert.equal(model.pattern, "dual");
    assert.match(model.body, /4問出し直し、4問で同じ手/);
  });

  it("場面ごとに分かれた記録では、場面を見る予測が当たり、見ない予測は外れる", () => {
    const journal = journalFrom((question) =>
      question.id === "unfinished-work" ? null : byContext(question.context),
    );
    const question = getQuestion("unfinished-work");
    assert.ok(question);
    const prediction = predictFor(journal, question);
    assert.equal(prediction?.context, "plus");
    assert.equal(prediction?.overall, "mid");
    assert.equal(predictFor(emptyJournal(), question), null);
  });

  it("場面ごとの表は、軸と場面の平均を持つ", () => {
    const model = buildModel(journalFrom((question) => byContext(question.context)));
    assert.equal(model.grid.tempo.work?.mean, 1);
    assert.equal(model.grid.tempo.close?.mean, -1);
    assert.equal(buildModel(emptyJournal()).grid.tempo.work, null);
  });

  it("15問を超えると、区切りに一つ確かめの問が入る", () => {
    const early = journalFrom((question) =>
      QUESTION_ORDER.indexOf(question) < 14 ? "plus" : null,
    );
    assert.equal(retestsDue(early), 0);
    assert.ok(nextRound(early).every((item) => !item.retest));

    const later = journalFrom((question) =>
      QUESTION_ORDER.indexOf(question) < 15 ? "plus" : null,
    );
    const round = nextRound(later);
    assert.equal(round.length, 5);
    assert.equal(round.filter((item) => item.retest).length, 1);
    assert.equal(round[2].retest, true);
    assert.ok(later.answers[round[2].id]);

    later.retests.push({
      id: round[2].id,
      pole: "plus",
      original: "plus",
      at: "2026-09-29T01:00:00.000Z",
    });
    assert.ok(nextRound(later).every((item) => !item.retest));
  });
});

describe("記録の読み込み", () => {
  it("壊れた記録は空に戻す", () => {
    assert.deepEqual(sanitizeJournal(null), emptyJournal());
    assert.deepEqual(sanitizeJournal({ version: 2 }), emptyJournal());
    const cleaned = sanitizeJournal({
      version: 1,
      answers: {
        "bet-work": { pole: "plus", updatedAt: "2026-09-29T00:00:00.000Z" },
        bad: { pole: "sideways", updatedAt: "2026-09-29T00:00:00.000Z" },
      },
      deferred: ["chase-alone", 12],
      retests: [
        { id: "bet-work", pole: "minus", original: "plus", at: "2026-09-29T01:00:00.000Z" },
        { id: "bet-work", pole: "plus", original: "plus", at: "2026-09-29T02:00:00.000Z" },
        { id: "missing", pole: "plus", original: "plus", at: "2026-09-29T01:00:00.000Z" },
      ],
    });
    assert.deepEqual(cleaned.answers["bet-work"]?.pole, "plus");
    assert.equal(cleaned.answers.bad, undefined);
    assert.deepEqual(cleaned.deferred, ["chase-alone"]);
    assert.equal(cleaned.retests.length, 1);
    assert.equal(cleaned.retests[0].pole, "minus");
    assert.deepEqual(sanitizeJournal({ version: 1, answers: {} }).retests, []);
  });
});
