// QuizResults.jsx
"use client";

import React, { useEffect, useMemo, useState } from "react";

/**
 * QuizResults
 * - Fetches weights from /public/boots_quiz_weights.json
 * - Normalises answers so we have title-based keys (needed because the weight map is keyed by title)
 * - Scores, tie-breaks, and renders the top-matching SKU + per-SKU scores
 *
 * Props:
 *  - answers: object of user answers (may be keyed by qid and/or title)
 *  - questions: array of { id, title } (used to map qid -> title for normalisation)
 *  - kiosk: boolean (styling)
 *  - context: string (debug context line under buttons)
 *  - onRestart: () => void
 *  - onContinue: () => void
 *  - postToParent?: (msg: any) => void   // optional analytics hook
 *  - brand?: { text?: string; border?: string }
 */

const WEIGHTS_URL = "/boots_quiz_weights.json";

// Stable order for tie-breaking
const PRODUCT_ORDER = [
  "Eic",
  "Epi",
  "Meca",
  "Ecp",
  "Cpe",
  "hcb",
  "Hpes",
  "Rnp",
  "Bmca",
  "Mjb",
  "Spe",
  "Shp",
  "Gsi",
];

// Must exactly match the title in the QUIZ sheet for the “top two priorities” question
const PRIORITIES_TITLE =
  "Which of the below are your top two priorities in the upcoming months?";

// ----------------- helpers -----------------
function normaliseAnswersByTitle(answers, questions) {
  // Copy current answers
  const out = { ...(answers || {}) };

  // If we only have qid-based keys, mirror them under the visible question title
  // (We don't overwrite existing title keys.)
  if (Array.isArray(questions)) {
    for (const q of questions) {
      const qid = q?.id;
      const title = q?.title;
      if (!qid || !title) continue;
      if (out[qid] != null && out[title] == null) {
        out[title] = out[qid];
      }
    }
  }

  return out;
}

function scoreAnswers(answersByTitle, weightsMap) {
  const tallies = {};
  const add = (code, n = 1) => {
    if (!code) return;
    tallies[code] = (tallies[code] || 0) + n;
  };

  Object.keys(weightsMap || {}).forEach((title) => {
    const optionMap = weightsMap[title] || {};
    const chosen = answersByTitle[title];

    if (Array.isArray(chosen)) {
      chosen.forEach((opt) => (optionMap[opt] || []).forEach((code) => add(code, 1)));
    } else if (chosen != null) {
      (optionMap[chosen] || []).forEach((code) => add(code, 1));
    }
  });

  return tallies; // e.g. { Eic: 3, Mjb: 2, ... }
}

function pickWinner(tallies, answersByTitle, weightsMap) {
  // 1) Highest score
  let max = -Infinity;
  let leaders = [];
  PRODUCT_ORDER.forEach((code) => {
    const v = tallies[code] || 0;
    if (v > max) {
      max = v;
      leaders = [code];
    } else if (v === max) {
      leaders.push(code);
    }
  });
  if (leaders.length === 1) return leaders[0];

  // 2) Tie-break using priorities (if present and mapped)
  const priMap = weightsMap?.[PRIORITIES_TITLE];
  const priAns = answersByTitle?.[PRIORITIES_TITLE];
  if (priMap && Array.isArray(priAns) && priAns.length) {
    for (const opt of priAns) {
      const codes = priMap[opt] || [];
      const match = codes[0];
      if (match && leaders.includes(match)) return match;
    }
  }

  // 3) Stable product order
  return leaders.sort(
    (a, b) => PRODUCT_ORDER.indexOf(a) - PRODUCT_ORDER.indexOf(b)
  )[0];
}

// ----------------- component -----------------
export default function QuizResults({
  answers,
  questions,
  kiosk,
  context,
  onRestart,
  onContinue,
  postToParent,
  brand,
}) {
  const BRAND = {
    text: brand?.text ?? "#111",
    border: brand?.border ?? "rgba(0,0,0,0.12)",
  };

  const [weights, setWeights] = useState({});

  // Fetch weights JSON
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(WEIGHTS_URL, { cache: "no-store" });
        const w = res.ok ? await res.json() : {};
        if (!cancelled) setWeights(w || {});
      } catch {
        if (!cancelled) setWeights({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Prepare scoring inputs
  const answersByTitle = useMemo(
    () => normaliseAnswersByTitle(answers, questions),
    [answers, questions]
  );

  const tallies = useMemo(
    () => scoreAnswers(answersByTitle, weights),
    [answersByTitle, weights]
  );

  const winner = useMemo(
    () => pickWinner(tallies, answersByTitle, weights),
    [tallies, answersByTitle, weights]
  );

  return (
    <div style={{ width: "90vw", maxWidth: "90vw", marginInline: "auto", textAlign: "center" }}>
      <h2 className={kiosk ? "text-3xl" : "text-2xl"} style={{ fontWeight: 600, marginBottom: 16 }}>
        Your recommendation
      </h2>

      <div
        className="mx-auto mb-6 rounded-3xl border p-6"
        style={{ width: "min(560px, 92vw)", borderColor: BRAND.border }}
      >
        <div className="text-6xl font-extrabold mb-2" style={{ color: BRAND.text }}>
          {winner || "—"}
        </div>
        <div style={{ opacity: 0.75 }}>
          {winner
            ? "Top match based on your answers."
            : "No result yet — please answer the questions."}
        </div>

        {Object.values(tallies).some((v) => v > 0) && (
          <div className="mt-4 text-left text-sm">
            {Object.entries(tallies)
              .filter(([_, v]) => v > 0)
              .sort((a, b) => b[1] - a[1])
              .map(([code, v]) => (
                <div key={code} className="flex justify-between">
                  <span>{code}</span>
                  <span>{v}</span>
                </div>
              ))}
          </div>
        )}
      </div>

      <div className="grid gap-3" style={{ width: "min(520px, 90vw)", marginInline: "auto" }}>
        <button
          className="rounded-2xl px-5 py-3 border"
          onClick={() => {
            postToParent?.({
              type: "NOURISHED_QUIZ_EVENT",
              event: "results_continue_clicked",
              payload: { winner },
            });
            onContinue?.();
          }}
        >
          Continue
        </button>

        <button
          className="rounded-2xl px-5 py-3 border"
          onClick={() => {
            onRestart?.();
          }}
        >
          Restart
        </button>
      </div>

      {context ? (
        <p className="text-xs" style={{ opacity: 0.6, marginTop: 16 }}>
          Context: <code>{context}</code>
        </p>
      ) : null}
    </div>
  );
}
