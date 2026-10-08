import {
  getQuestionByNumber,
  headingOf,
  QUESTIONS,
  TOTAL_QUESTIONS,
  type Question,
} from "@/lib/questions";

export type Choice = 1 | 2 | 3 | "hold";

export type AnswerRecord = {
  choice: Choice;
  note: string;
  updatedAt: string;
};

export type Journal = {
  version: 2;
  answers: Record<string, AnswerRecord>;
};

export const SESSION_SIZE = 5;
export const MAX_NOTE_LENGTH = 1000;

export function emptyJournal(): Journal {
  return { version: 2, answers: {} };
}

export function isChoice(value: unknown): value is Choice {
  return value === 1 || value === 2 || value === 3 || value === "hold";
}

export function choiceLabel(question: Question, choice: Choice) {
  return choice === "hold" ? "保留" : `${choice}　${question.choices[choice - 1]}`;
}

export function answeredCount(journal: Journal) {
  return QUESTIONS.filter((question) => journal.answers[question.id]).length;
}

export function heldCount(journal: Journal) {
  return QUESTIONS.filter((question) => journal.answers[question.id]?.choice === "hold").length;
}

export function nextRound(journal: Journal): string[] {
  return QUESTIONS.filter((question) => !journal.answers[question.id])
    .slice(0, SESSION_SIZE)
    .map((question) => question.id);
}

export type CategorySummary = {
  category: string;
  total: number;
  answered: number;
  held: number;
};

export function categorySummaries(journal: Journal): CategorySummary[] {
  const summaries = new Map<string, CategorySummary>();
  for (const question of QUESTIONS) {
    const summary = summaries.get(question.category) ?? {
      category: question.category,
      total: 0,
      answered: 0,
      held: 0,
    };
    const answer = journal.answers[question.id];
    summary.total += 1;
    if (answer) summary.answered += 1;
    if (answer?.choice === "hold") summary.held += 1;
    summaries.set(question.category, summary);
  }
  return [...summaries.values()];
}

export type Comparison = {
  question: Question;
  answer: AnswerRecord | undefined;
  bases: { question: Question; answer: AnswerRecord | undefined }[];
};

export function comparisons(journal: Journal): Comparison[] {
  return QUESTIONS.filter((question) => question.compareWith.length > 0).map((question) => ({
    question,
    answer: journal.answers[question.id],
    bases: question.compareWith.flatMap((number) => {
      const base = getQuestionByNumber(number);
      return base ? [{ question: base, answer: journal.answers[base.id] }] : [];
    }),
  }));
}

export function journalText(journal: Journal) {
  const blocks = QUESTIONS.map((question) => {
    const answer = journal.answers[question.id];
    return [
      headingOf(question),
      `第${question.number}問／${TOTAL_QUESTIONS}`,
      "",
      question.situation,
      "",
      ...question.choices.map((choice, index) => `${index + 1}　${choice}`),
      "",
      `回答：${answer ? (answer.choice === "hold" ? "保留" : answer.choice) : ""}`,
      `理由・補足（任意）：${answer?.note ?? ""}`,
    ].join("\n");
  });
  return [
    "場面で選ぶ100問（3択）",
    `回答 ${answeredCount(journal)}/${TOTAL_QUESTIONS}問（うち保留 ${heldCount(journal)}問）`,
    "",
    ...blocks.flatMap((block) => [block, "", ""]),
  ]
    .join("\n")
    .trimEnd();
}
