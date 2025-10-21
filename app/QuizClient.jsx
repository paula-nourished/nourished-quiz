// QuizClient.jsx
"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";

/**
 * Nourished Formula Quiz — clean rebuild
 * - Landing → Questions → Results flow in a 90vw canvas
 * - Questions loaded from /public/boots_quiz_questions.json
 * - Weightings loaded from /public/boots_quiz_weights.json (derived from your Excel "QUIZ" tab)
 * - Answers stored by id AND by title (so weights keyed by title can score)
 * - Robust scorer: fuzzy title matching, id→label, label normalisation, slider bucketing
 * - Optional debug panel: add ?debug=1 to URL
 */

// ---- brand
const BRAND = {
  text: "#153247",
  border: "#d6d1c9",
};

// ---- scoring config
const WEIGHTS_URL = "/boots_quiz_weights.json";       // put this JSON in /public
const QUESTIONS_URL = "/boots_quiz_questions.json";    // your questions JSON in /public
const PRODUCT_ORDER = ["Eic","Epi","Meca","Ecp","Cpe","hcb","Hpes","Rnp","Bmca","Mjb","Spe","Shp","Gsi"];
const PRIORITIES_TITLE = "Which of the below are your top two priorities in the upcoming months?";

// ---- small utils
function useQueryParams() {
  const [params, setParams] = useState(null);
  useEffect(() => {
    if (typeof window !== "undefined") setParams(new URLSearchParams(window.location.search));
  }, []);
  const get = (k, fallback = null) => (params ? params.get(k) ?? fallback : fallback);
  return { get, raw: params };
}
function postToParent(message) {
  try { window.parent?.postMessage(message, "*"); } catch {}
}
function useAutoResize() {
  useEffect(() => {
    const sendHeight = () => {
      const h = document.documentElement.scrollHeight || document.body.scrollHeight || 0;
      postToParent({ type: "NOURISHED_QUIZ_HEIGHT", height: h });
    };
    sendHeight();
    const ro = new ResizeObserver(sendHeight);
    ro.observe(document.body);
    window.addEventListener("load", sendHeight);
    const i = setInterval(sendHeight, 1000);
    return () => {
      ro.disconnect();
      window.removeEventListener("load", sendHeight);
      clearInterval(i);
    };
  }, []);
}
function getDebugFlag() {
  try {
    const usp = new URLSearchParams(window.location.search);
    return usp.get("debug") === "1";
  } catch { return false; }
}
const DEBUG_SCORING = typeof window !== "undefined" ? getDebugFlag() : false;

// ---- title/label normaliser
function norm(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[’“”"']/g, "'")
    .trim();
}

// ---- centered 90vw stage
function Stage({ kiosk, children }) {
  return (
    <div
      style={{
        width: "100%",
        minHeight: kiosk ? "100dvh" : "80dvh",
        display: "grid",
        placeItems: "center",
        paddingBlock: kiosk ? 24 : 16,
        boxSizing: "border-box",
      }}
    >
      <div style={{ width: "90vw", maxWidth: "90vw", marginInline: "auto" }}>{children}</div>
    </div>
  );
}

// ---- buttons
function Button({ children, onClick, type = "button", disabled, kiosk, bg, textColor }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`w-full ${kiosk ? "py-6 text-xl" : "py-3 text-base"} rounded-2xl border 
        focus:outline-none focus-visible:ring-4 focus-visible:ring-offset-2 
        disabled:opacity-50`}
      style={{
        background: bg ?? "white",
        color: textColor ?? BRAND.text,
        borderColor: BRAND.border,
      }}
    >
      {children}
    </button>
  );
}

// ---- idle/attract
function AttractScreen({ onStart, kiosk }) {
  return (
    <Stage kiosk={kiosk}>
      <div style={{ textAlign: "center" }}>
        <img
          src="/nourished-formula-logo.svg"
          alt="Nourished Formula"
          className="h-auto mx-auto mb-6"
          draggable="false"
          style={{ width: "min(66%, 480px)", marginBottom: "8%" }}
        />
        <h1 className={kiosk ? "text-5xl" : "text-4xl"} style={{ fontWeight: 700, marginBottom: 12, color: BRAND.text }}>
          Find your perfect stack
        </h1>
        <p className={kiosk ? "text-xl" : "text-lg"} style={{ color: BRAND.text, opacity: 0.85, marginBottom: 24 }}>
          Answer a few quick questions and we’ll match you to the right Nourished formula.
        </p>
        <div className="mx-auto" style={{ maxWidth: 360 }}>
          <Button kiosk={kiosk} onClick={onStart} bg="#e2c181" textColor="#153247">
            Get Started
          </Button>
        </div>
        <p style={{ fontWeight: 300, marginTop: 40, color: BRAND.text, fontSize: 12 }}>
          Please note: This quiz is designed to help you select a personalised vitamin stack based on your lifestyle and
          wellness goals. It is not intended to diagnose or treat any medical condition. If you are pregnant,
          breastfeeding, taking medication or under medical supervision, please consult a healthcare professional before
          taking any supplements.
        </p>
      </div>
    </Stage>
  );
}

// ---- icons (you can adjust as you add assets)
function getAnswerIconPath(label) {
  const key = String(label || "").toLowerCase();
  if (key.includes("energy")) return "/icons/energy.svg";
  if (key.includes("rest") || key.includes("sleep")) return "/icons/rest.svg";
  if (key.includes("focus") || key.includes("memory")) return "/icons/memory.svg";
  if (key.includes("immun")) return "/icons/immunity.svg";
  if (key.includes("hair")) return "/icons/hair.svg";
  if (key.includes("skin")) return "/icons/skin.svg";
  if (key.includes("joint")) return "/icons/joint.svg";
  if (key.includes("mood") || key.includes("positive")) return "/icons/positive.svg";
  if (key.includes("gut") || key.includes("digest")) return "/icons/digestion.svg";
  if (key.includes("cardio") || key.includes("heart")) return "/icons/heart.svg";
  if (key.includes("menopause")) return "/icons/menopause.svg";
  if (key.includes("menstrual")) return "/icons/menstrual.svg";
  if (key.includes("weight")) return "/icons/weight.svg";
  if (key.includes("stress")) return "/icons/stress.svg";
  return "/icons/sparkles.svg";
}

// ---- tiles palette & styles
const PERIODIC_PALETTE = [
  { bg: "#DC8B73", text: "#ffffff" },
  { bg: "#F1B562", text: "#153247" },
  { bg: "#79B9B7", text: "#153247" },
  { bg: "#C7B6D8", text: "#153247" },
  { bg: "#E0D7C9", text: "#153247" },
  { bg: "#afb28b", text: "#153247" },
  { bg: "#c38c96", text: "#153247" },
];
const TILE = {
  bg: "rgba(255,255,255,0.9)",
  border: "rgba(21,50,71,.10)",
  borderActive: "rgba(21,50,71,.55)",
  shadow: "0 6px 16px rgba(21,50,71,.10)",
  shadowActive: "0 10px 20px rgba(21,50,71,.18)",
};

// ---- option renders
function PeriodicOptions({ options, value, onChange, kiosk }) {
  const iconSize = kiosk ? 88 : 72;
  return (
    <div
      role="radiogroup"
      className="grid gap-4 justify-center [grid-template-columns:repeat(auto-fit,minmax(280px,280px))] max-w-[calc(4*280px+3*1rem)]"
      style={{ width: "90vw", maxWidth: "90vw", marginInline: "auto", boxSizing: "border-box" }}
    >
      {(options || []).map((opt, i) => {
        const sel = value === opt.id;
        const col = PERIODIC_PALETTE[i % PERIODIC_PALETTE.length];
        const iconPath = getAnswerIconPath(opt.label);
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={sel ? "true" : "false"}
            onClick={() => onChange(opt.id)}
            className="relative w-full rounded-3xl transition-all text-left focus:outline-none focus-visible:ring-4 focus-visible:ring-offset-2"
            style={{
              background: TILE.bg,
              border: `2px solid ${sel ? TILE.borderActive : TILE.border}`,
              boxShadow: sel ? TILE.shadowActive : TILE.shadow,
              transform: sel ? "translateY(-1px)" : "none",
              color: BRAND.text,
            }}
          >
            <div className="flex items-center gap-5" style={{ padding: kiosk ? 24 : 18 }}>
              <div className="rounded-2xl shrink-0 grid place-items-center" style={{ width: iconSize, height: iconSize, background: col.bg }} aria-hidden="true">
                {iconPath && <img src={iconPath} alt="" draggable="false" style={{ width: Math.round(iconSize * 0.7), height: Math.round(iconSize * 0.7), objectFit: "contain" }} />}
              </div>
              <div className={`${kiosk ? "text-2xl" : "text-xl"} font-semibold leading-snug`}>{opt.label}</div>
            </div>
            {sel && (
              <div aria-hidden className="absolute top-3 right-3 rounded-full"
                style={{ width: kiosk ? 26 : 22, height: kiosk ? 26 : 22, border: "2px solid rgba(21,50,71,.9)", background: "rgba(255,255,255,.9)", display: "grid", placeItems: "center", fontSize: kiosk ? 14 : 12, color: "#153247", fontWeight: 800 }}>
                ✓
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
function PeriodicOptionsMulti({ options, values = [], onToggle, kiosk, maxSelect = 2 }) {
  const selectedSet = new Set(values);
  const disabledAll = values.length >= maxSelect;
  const iconSize = kiosk ? 88 : 72;
  return (
    <div role="group" className="grid gap-4 justify-items-stretch grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
      style={{ width: "90vw", maxWidth: "90vw", marginInline: "auto", boxSizing: "border-box" }}>
      {(options || []).map((opt, i) => {
        const sel = selectedSet.has(opt.id);
        const canClick = sel || !disabledAll;
        const col = PERIODIC_PALETTE[i % PERIODIC_PALETTE.length];
        const iconPath = getAnswerIconPath(opt.label);
        return (
          <button
            key={opt.id}
            type="button"
            aria-pressed={sel ? "true" : "false"}
            onClick={() => canClick && onToggle(opt.id)}
            className={`relative w-full rounded-3xl transition-all text-left focus:outline-none focus-visible:ring-4 focus-visible:ring-offset-2 ${canClick ? "cursor-pointer" : "opacity-60 cursor-not-allowed"}`}
            style={{
              background: TILE.bg,
              border: `2px solid ${sel ? TILE.borderActive : TILE.border}`,
              boxShadow: sel ? TILE.shadowActive : TILE.shadow,
              transform: sel ? "translateY(-1px)" : "none",
              color: BRAND.text,
            }}
          >
            <div className="flex items-center gap-5" style={{ padding: kiosk ? 24 : 18 }}>
              <div className="rounded-2xl shrink-0 grid place-items-center" style={{ width: iconSize, height: iconSize, background: col.bg }} aria-hidden="true">
                {iconPath && <img src={iconPath} alt="" draggable="false" style={{ width: Math.round(iconSize * 0.7), height: Math.round(iconSize * 0.7), objectFit: "contain" }} />}
              </div>
              <div className={`${kiosk ? "text-2xl" : "text-xl"} font-semibold leading-snug`}>{opt.label}</div>
            </div>
            {sel && (
              <div aria-hidden className="absolute top-3 right-3 rounded-full"
                style={{ width: kiosk ? 26 : 22, height: kiosk ? 26 : 22, border: "2px solid rgba(21,50,71,.9)", background: "rgba(255,255,255,.9)", display: "grid", placeItems: "center", fontSize: kiosk ? 14 : 12, color: "#153247", fontWeight: 800 }}>
                ✓
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
function AnswerChip({ selected, children, onClick, kiosk }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      className={`flex items-center justify-between w-full ${kiosk ? "p-6 text-xl" : "p-4 text-base"} rounded-2xl border mb-3 text-left`}
      style={{ borderColor: selected ? BRAND.text : BRAND.border, boxShadow: selected ? `0 0 0 3px ${BRAND.text}33` : "none", color: BRAND.text, background: "transparent" }}
    >
      <span>{children}</span>
      <span aria-hidden>{selected ? "✓" : ""}</span>
    </button>
  );
}

// ---- helpers
function normalizeOptionsFromAny(q, idx) {
  let raw = q.options ?? q.answers ?? q.choices ?? [];
  if (typeof raw === "string") raw = raw.split(/[,;|]/g).map((s) => s.trim()).filter(Boolean);
  if (Array.isArray(raw) && raw.every((v) => typeof v === "string")) {
    return raw.map((s) => ({ id: s, label: s }));
  }
  if (Array.isArray(raw) && raw.length && typeof raw[0] === "object") {
    return raw.map((o, i) => {
      const id = String(o.id ?? o.value ?? o.code ?? o.label ?? `${idx}_${i}`);
      const label = String(o.label ?? o.name ?? o.text ?? o.value ?? o.id ?? id);
      return { id, label };
    });
  }
  return [];
}
const titleIncludes = (q, substr) => q?.title && String(q.title).toLowerCase().includes(String(substr).toLowerCase());
const isNo = (val) => String(val ?? "").toLowerCase() === "no";

// ---- SCORING (robust)
function buildOptionLabelIndex(questions) {
  // title -> { id -> label }
  const index = {};
  (questions || []).forEach((q) => {
    const map = {};
    (q?.answers || []).forEach((a) => {
      const id = String(a?.id ?? a?.value ?? a?.label ?? "");
      const label = String(a?.label ?? a?.name ?? a?.value ?? a?.id ?? id);
      if (id) map[id] = label;
    });
    if (q?.title) index[q.title] = map;
  });
  return index;
}

function scoreAnswers(answers, weightsMap, questions) {
  const tallies = {};
  const add = (code, n = 1) => { if (!code) return; tallies[code] = (tallies[code] || 0) + n; };
  if (!answers || !weightsMap) return tallies;

  const labelIndex = buildOptionLabelIndex(questions);

  // weights lookup by normalised TITLE
  const weightsNorm = new Map(Object.entries(weightsMap || {}).map(([t, map]) => [norm(t), { title: t, map }]));
  const findWeightsForTitle = (qTitle) => {
    const n = norm(qTitle);
    const exact = weightsNorm.get(n);
    if (exact) return exact;
    for (const [kn, obj] of weightsNorm.entries()) {
      if (n.includes(kn) || kn.includes(n)) return obj;
    }
    return null;
  };
  const sliderBucketLabel = (optionMap, value) => {
    const keys = Object.keys(optionMap || {});
    if (!keys.length) return null;
    const low = keys[0];
    const high = keys[keys.length - 1];
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    if (n <= 2) return low;
    if (n >= 4) return high;
    return null; // middle neutral
  };

  (questions || []).forEach((q) => {
    try {
      const qTitle = q?.title;
      if (!qTitle) return;

      const found = findWeightsForTitle(qTitle);
      if (!found) { if (DEBUG_SCORING) console.debug("[score] no weights for:", qTitle); return; }

      const optionMap = found.map;                          // label -> [product codes]
      const optionMapNorm = new Map(Object.keys(optionMap).map((label) => [norm(label), label]));

      // prefer title key; fallback to id key
      let chosen = answers[qTitle];
      if (chosen == null) chosen = answers[q.id];
      if (chosen == null) { if (DEBUG_SCORING) console.debug("[score] no answer for:", qTitle); return; }

      // id -> label
      const idToLabel = (v) => {
        const vStr = String(v);
        if (Object.prototype.hasOwnProperty.call(optionMap, vStr)) return vStr; // already a label
        const lbl = (labelIndex[qTitle] || {})[vStr];
        if (lbl && optionMap[lbl]) return lbl;
        const fromNorm = optionMapNorm.get(norm(vStr));
        return fromNorm || vStr;
      };

      // normalise to labels present in optionMap
      let labels = [];
      if (Array.isArray(chosen)) {
        labels = chosen
          .map(idToLabel)
          .map((lab) => optionMapNorm.get(norm(lab)) || lab)
          .filter((lab) => optionMap[lab]);
      } else if (typeof chosen === "number" || /^[0-9]+$/.test(String(chosen))) {
        const lab = sliderBucketLabel(optionMap, chosen);
        if (lab && optionMap[lab]) labels = [lab];
      } else {
        const lab0 = idToLabel(chosen);
        const lab = optionMapNorm.get(norm(lab0)) || lab0;
        if (optionMap[lab]) labels = [lab];
      }

      if (!labels.length && DEBUG_SCORING) {
        console.debug("[score] no label match", { qTitle, chosen, options: Object.keys(optionMap) });
      }

      labels.forEach((lab) => (optionMap[lab] || []).forEach((code) => add(code, 1)));
    } catch (e) {
      if (DEBUG_SCORING) console.warn("[score] skip:", q?.title, e);
    }
  });

  return tallies;
}

function pickWinner(tallies, answers, weightsMap) {
  const order = Array.isArray(PRODUCT_ORDER) ? PRODUCT_ORDER : [];
  if (!order.length) return null;

  // max score
  let max = -Infinity, leaders = [];
  order.forEach((code) => {
    const v = Number(tallies?.[code] || 0);
    if (v > max) { max = v; leaders = [code]; }
    else if (v === max) leaders.push(code);
  });

  if (!leaders.length) return null;
  if (leaders.length === 1) return leaders[0];

  // tie-break by priorities
  const priMap = weightsMap?.[PRIORITIES_TITLE];
  const priAns = answers?.[PRIORITIES_TITLE];
  if (priMap && Array.isArray(priAns) && priAns.length) {
    for (const opt of priAns) {
      const match = (priMap[opt] || [])[0];
      if (match && leaders.includes(match)) return match;
    }
  }

  // stable fallback
  return leaders.sort((a, b) => order.indexOf(a) - order.indexOf(b))[0] || null;
}

// ---- Main component
export default function QuizClient() {
  const { get } = useQueryParams();
  const kiosk = get("kiosk", "0") === "1";
  const context = get("context", "default");

  useAutoResize();

  // Idle
  const [idle, setIdle] = useState(true);
  const idleTimer = useRef(null);
  const IDLE_MS = kiosk ? 30000 : 120000;

  // Data
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [error, setError] = useState(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [weights, setWeights] = useState({});

  const resetAll = useCallback(() => { setAnswers({}); setStep(0); }, []);
  const bumpIdle = useCallback(() => {
    setIdle(false);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => { setIdle(true); resetAll(); }, IDLE_MS);
  }, [IDLE_MS, resetAll]);

  useEffect(() => {
    const onAny = () => bumpIdle();
    ["pointerdown", "keydown", "touchstart"].forEach((ev) => window.addEventListener(ev, onAny));
    bumpIdle();
    return () => ["pointerdown", "keydown", "touchstart"].forEach((ev) => window.removeEventListener(ev, onAny));
  }, [bumpIdle]);

  // Load questions
  const FALLBACK = [
    { id: "goal", title: "What's your primary goal?", type: "single", options: ["Energy","Immunity","Skin & Hair","Sleep"], required: true },
  ];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(QUESTIONS_URL, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const src = Array.isArray(data) ? data : [];

        const transformed = src.map((q, i) => {
          const opts = normalizeOptionsFromAny(q, i);
          const t = String(q.type || "").toLowerCase();
          const typeMap = { slider: "slider", range: "slider", scale: "slider", likert: "slider" };
          const inferred = !t && (!opts.length && (q.minLabel || q.maxLabel)) ? "slider" : (opts.length ? "single" : "single");
          let qtype = typeMap[t] || inferred;

          return {
            id: String(q.id ?? `q_${i}`),
            title: q.title ?? `Question ${i + 1}`,
            type: qtype,
            answers: opts,
            minLabel: q.minLabel,
            maxLabel: q.maxLabel,
            required: qtype === "slider" ? false : true,
          };
        });

        if (!cancelled) setQuestions(transformed.length ? transformed : FALLBACK);
      } catch (e) {
        if (!cancelled) { setError(String(e?.message || e)); setQuestions(FALLBACK); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

// Load weightings (robust)
useEffect(() => {
  let cancelled = false;

  async function tryLoad(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Fetch ${url} failed: HTTP ${res.status}`);
    return res.json();
  }

  (async () => {
    try {
      let w = await tryLoad("/boots_quiz_weights.json");
      if (!cancelled) setWeights(w || {});
    } catch (e1) {
      console.error("[weights] primary failed:", e1);
      try {
        let w2 = await tryLoad("boots_quiz_weights.json"); // relative fallback
        if (!cancelled) setWeights(w2 || {});
      } catch (e2) {
        console.error("[weights] fallback failed:", e2);
        if (!cancelled) {
          setWeights({});
          // OPTIONAL: expose a visible note in results if you want
          (window.__WEIGHTS_ERROR__ = String(e2?.message || e2));
        }
      }
    }
  })();

  return () => { cancelled = true; };
}, []);


  // Flow guards
  const total = Array.isArray(questions) ? questions.length : 0;
  const isLoading = total === 0;                 // wait for questions
  const isResults = total > 0 && step > total;   // results only when we have questions
  const current = step === 0 ? null : questions[step - 1];

  useEffect(() => {
    if (total === 0) return;
    const maxStep = total + 1; // +1 results
    if (step < 0 || step > maxStep) setStep(0);
  }, [total, step]);

  // Answer setter (stores by id AND by title)
  function setAnswer(qid, value, mode = "single") {
    setAnswers((prev) => {
      const next = { ...prev };
      const titleKey = current?.title;
      const saveVal = (destKey) => {
        if (!destKey) return;
        if (mode === "multi") {
          const set = new Set(Array.isArray(prev[destKey]) ? prev[destKey] : []);
          set.has(value) ? set.delete(value) : set.add(value);
          next[destKey] = Array.from(set);
        } else if (mode === "multi-limit-2") {
          const set = new Set(Array.isArray(prev[destKey]) ? prev[destKey] : []);
          if (set.has(value)) set.delete(value);
          else if (set.size < 2) set.add(value);
          next[destKey] = Array.from(set);
        } else {
          next[destKey] = value;
        }
      };
      saveVal(qid);
      if (titleKey) saveVal(titleKey);
      return next;
    });
  }

  function canContinue() {
    if (step === 0) return true;
    if (!current) return true;
    if (current.type === "slider") return true;
    if (current.required === false) return true;
    const v = answers[current.id] ?? answers[current.title];
    return Array.isArray(v) ? v.length > 0 : Boolean(v);
  }

  // Simple skip example: if a "specific diet?" is No, skip "which diet?"
  const isSpecificDiet = (q) => titleIncludes(q, "specific diet");
  const isWhichDiet    = (q) => titleIncludes(q, "which diet");

  const goNext = () => {
    setStep((s) => {
      if (s >= total) return total + 1;
      const currIndex = s - 1;
      const currQ = questions[currIndex];
      let nextStep = s + 1;

      if (currQ && isSpecificDiet(currQ)) {
        const ans = answers[currQ.id] ?? answers[currQ.title];
        const nextQ = questions[currIndex + 1];
        if (isNo(ans) && nextQ && isWhichDiet(nextQ)) nextStep = s + 2;
      }
      if (nextStep > total) return total + 1;
      return nextStep;
    });
  };
  const goBack = () => setStep((s) => Math.max(0, s - 1));

  return (
    <div
      className="min-h-screen"
      style={{
        color: BRAND.text,
        backgroundImage: "url('/formula-code-bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* GLOBAL SLIDER STYLES */}
      <style jsx global>{`
        .nourished-range { -webkit-appearance: none; appearance: none; width: 100%; height: 14px; border-radius: 7px; background: #ffffff; outline: none; }
        .nourished-range::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 32px; height: 32px; border-radius: 50%; background: ${BRAND.text}; border: 2px solid #fff; box-shadow: 0 0 0 2px ${BRAND.text}; cursor: pointer; margin-top: -9px; }
        .nourished-range::-webkit-slider-runnable-track { height: 14px; border-radius: 7px; background: transparent; }
        .nourished-range::-moz-range-thumb { width: 32px; height: 32px; border-radius: 50%; background: ${BRAND.text}; border: 2px solid #fff; box-shadow: 0 0 0 2px ${BRAND.text}; cursor: pointer; }
        .nourished-range::-moz-range-track { height: 14px; border-radius: 7px; background: transparent; }
      `}</style>

      {/* Loading guard */}
      {isLoading && (
        <Stage kiosk={kiosk}>
          <div style={{ width: "90vw", maxWidth: "90vw", marginInline: "auto", textAlign: "center" }}>
            <h2 className={kiosk ? "text-3xl" : "text-2xl"} style={{ fontWeight: 600, marginBottom: 12 }}>Loading quiz…</h2>
            <div style={{ opacity: 0.7 }}>One moment while we fetch your questions.</div>
          </div>
        </Stage>
      )}

      {/* idle attract */}
      {!isLoading && kiosk && idle && !isResults && (
        <AttractScreen
          kiosk={kiosk}
          onStart={() => { setIdle(false); setAnswers({}); setStep(1); }}
        />
      )}

      {/* main */}
      {!isLoading && !isResults && !idle && (
        <>
          {step === 0 ? (
            <Stage kiosk={kiosk}>
              <div style={{ textAlign: "center" }}>
                <img src="/nourished-formula-logo.svg" alt="Nourished Formula" className="h-auto mx-auto mb-6" draggable="false" style={{ width: "min(66%, 480px)", marginBottom: "8%" }} />
                <h1 className={kiosk ? "text-5xl" : "text-4xl"} style={{ fontWeight: 700, marginBottom: 12 }}>Find your perfect stack</h1>
                <p className={kiosk ? "text-xl" : "text-lg"} style={{ opacity: 0.85, marginBottom: 24 }}>
                  Answer a few quick questions and we’ll match you to the right Nourished formula.
                </p>
                <div className="mx-auto" style={{ maxWidth: 360 }}>
                  <Button kiosk={kiosk} onClick={() => setStep(1)} bg="#e2c181" textColor="#153247">Get Started</Button>
                </div>
                <p style={{ fontWeight: 300, marginTop: 40, fontSize: 12 }}>
                  Please note: This quiz is designed to help you select a personalised vitamin stack based on your
                  lifestyle and wellness goals. It is not intended to diagnose or treat any medical condition.
                </p>
              </div>
            </Stage>
          ) : (
            <Stage kiosk={kiosk}>
              {!loading && current && (
                <section style={{ width: "90vw", maxWidth: "90vw", marginInline: "auto" }}>
                  <h2 className={kiosk ? "text-5xl" : "text-3xl"} style={{ fontWeight: 700, marginBottom: kiosk ? 36 : 28, textAlign: "center", lineHeight: 1.15 }}>
                    {current.title}
                  </h2>

                  {/* body */}
                  {(() => {
                    // slider?
                    if (current.type === "slider") {
                      const val = Number(answers[current.id] ?? answers[current.title] ?? 3);
                      const fillPct = Math.max(0, Math.min(100, ((val - 1) / 4) * 100)); // 1..5 -> 0..100%
                      return (
                        <div style={{ width: "90vw", maxWidth: "90vw", marginInline: "auto" }}>
                          <div className="flex justify-between" style={{ fontSize: kiosk ? "1.5rem" : "1.1rem", fontWeight: 700, marginBottom: 16 }}>
                            <span>{current.minLabel || "Low"}</span>
                            <span>{current.maxLabel || "High"}</span>
                          </div>
                          <input
                            type="range" min="1" max="5" step="1"
                            value={val}
                            onChange={(e) => setAnswer(current.id, Number(e.target.value), "slider")}
                            aria-label={current.title}
                            className="nourished-range"
                            style={{ width: "100%", background: `linear-gradient(to right, ${BRAND.text} 0%, ${BRAND.text} ${fillPct}%, #ffffff ${fillPct}%, #ffffff 100%)` }}
                          />
                        </div>
                      );
                    }

                    // multi?
                    if (current.type === "multi") {
                      const vals = Array.isArray(answers[current.id] ?? answers[current.title]) ? (answers[current.id] ?? answers[current.title]) : [];
                      return (
                        <div role="group" style={{ width: "90vw", maxWidth: "90vw", marginInline: "auto" }}>
                          {(current.answers || []).map((a) => {
                            const selected = vals.includes(a.id);
                            return (
                              <AnswerChip key={a.id} kiosk={kiosk} selected={selected} onClick={() => setAnswer(current.id, a.id, "multi")}>
                                {a.label}
                              </AnswerChip>
                            );
                          })}
                        </div>
                      );
                    }

                    // default single
                    return (
                      <PeriodicOptions
                        options={current.answers}
                        value={(answers[current.id] ?? answers[current.title]) || ""}
                        onChange={(val) => setAnswer(current.id, val, "single")}
                        kiosk={kiosk}
                      />
                    );
                  })()}

                  {/* nav */}
                  <div className="mt-6 grid grid-cols-2 gap-3" style={{ width: "min(720px, 90vw)", marginInline: "auto" }}>
                    <Button kiosk={kiosk} onClick={goBack} disabled={step === 0}>Back</Button>
                    <Button kiosk={kiosk} onClick={goNext} disabled={!canContinue()}>
                      {step === total ? "See results" : "Continue"}
                    </Button>
                  </div>
                </section>
              )}

              {loading && <p style={{ width: "90vw", marginInline: "auto" }}>Loading…</p>}
              {error && (
                <p className="text-sm" style={{ color: "#b91c1c", width: "90vw", marginInline: "auto" }}>
                  Couldn’t load questions (using fallback): {error}
                </p>
              )}
            </Stage>
          )}
        </>
      )}

      {/* results */}
      {!isLoading && isResults && (
        <Stage kiosk={kiosk}>
          <div style={{ width: "90vw", maxWidth: "90vw", marginInline: "auto", textAlign: "center" }}>
            <h2 className={kiosk ? "text-3xl" : "text-2xl"} style={{ fontWeight: 600, marginBottom: 16 }}>
              Your recommendation
            </h2>

            {/* Optional debug panel: add ?debug=1 to see it */}
            {DEBUG_SCORING && (
              <div
                className="mx-auto mb-4 rounded-xl border p-3 text-left text-xs"
                style={{ width: "min(860px, 92vw)", borderColor: BRAND.border, background: "rgba(255,255,255,0.6)" }}
              >
                <strong>Debug:</strong>
                <pre style={{ whiteSpace: "pre-wrap", marginTop: 8 }}>
{(() => {
  try {
    const t = scoreAnswers(answers, weights, questions);
    return JSON.stringify({ answeredKeys: Object.keys(answers || {}), tallies: t, questionCount: questions?.length || 0 }, null, 2);
  } catch (e) {
    return "error: " + String(e?.message || e);
  }
})()}
                </pre>
              </div>
            )}

            {(() => {
              try {
                if (!weights || !Object.keys(weights).length) {
                  return <div style={{ marginBottom: 16, opacity: 0.85 }}>Loading scoring data…</div>;
                }

                const tallies = scoreAnswers(answers, weights, questions);
                const winner = pickWinner(tallies, answers, weights);

                return (
                  <>
                    <div className="mx-auto mb-6 rounded-3xl border p-6" style={{ width: "min(560px, 92vw)", borderColor: BRAND.border }}>
                      <div className="text-6xl font-extrabold mb-2" style={{ color: BRAND.text }}>{winner || "—"}</div>
                      <div style={{ opacity: 0.75 }}>
                        {winner ? "Top match based on your answers." : "No result yet — please answer the questions."}
                      </div>

                      {Object.values(tallies || {}).some((v) => v > 0) && (
                        <div className="mt-4 text-left text-sm">
                          {Object.entries(tallies)
                            .filter(([_, v]) => v > 0)
                            .sort((a, b) => b[1] - a[1])
                            .map(([code, v]) => (
                              <div key={code} className="flex justify-between">
                                <span>{code}</span><span>{v}</span>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>

                    <div className="grid gap-3" style={{ width: "min(520px, 90vw)", marginInline: "auto" }}>
                      <Button
                        kiosk={kiosk}
                        onClick={() => {
                          postToParent({ type: "NOURISHED_QUIZ_EVENT", event: "results_continue_clicked", payload: { winner } });
                        }}
                      >
                        Continue
                      </Button>
                      <Button
                        kiosk={kiosk}
                        onClick={() => { setAnswers({}); setStep(0); setIdle(false); }}
                      >
                        Restart
                      </Button>
                    </div>
            </>
                );
              } catch (err) {
                console.error("Results render error:", err);
                return <div style={{ marginBottom: 16, color: "#b91c1c" }}>Sorry — something went wrong rendering results.</div>;
              }
            })()}

            <p className="text-xs" style={{ opacity: 0.6, marginTop: 16 }}>
              Context: <code>{context}</code>
            </p>
          </div>
        </Stage>
      )}

      <div className="h-4" aria-hidden />
    </div>
  );
}
