"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";

/**
 * Nourished Formula Quiz — 90vw layout
 * - All pages (landing, questions, results) render inside a 90vw container
 * - Kiosk idle screen "Get Started" jumps straight to Q1
 * - Robust slider detection (accepts: slider/range/scale/likert OR inferred from min/max labels)
 * - Priorities: icon tiles (max 2)
 * - Exercise: multi-select tiles (max 2)
 * - Gender: icon tiles
 * - Processed-food question gets split title + helper text
 */

// ---- brand
const BRAND = {
  text: "#153247",
  border: "#d6d1c9",
};


// ---- utilities
function useQueryParams() {
  const [params, setParams] = useState(null);
  useEffect(() => {
    if (typeof window !== "undefined") setParams(new URLSearchParams(window.location.search));
  }, []);
  const get = (k, fallback = null) => (params ? params.get(k) ?? fallback : fallback);
  return { get, raw: params };
}

function postToParent(message) {
  try {
    window.parent?.postMessage(message, "*");
  } catch {}
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
      <div
        style={{
          width: "90vw",
          maxWidth: "90vw",
          marginInline: "auto",
        }}
      >
        {children}
      </div>
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

// ---- icon mappers (public/icons/*.svg)
function getGenderIconPath(label) {
  const key = String(label || "").toLowerCase();
  if (key.includes("female") || key.includes("woman") || key.includes("women")) return "/icons/female.svg";
  if (key.includes("male") || key.includes("man") || key.includes("men")) return "/icons/male.svg";
  if (key.includes("non-binary") || key.includes("nonbinary") || key.includes("non binary")) return "/icons/non-binary.svg";
  if (key.includes("prefer not") || key.includes("rather not")) return "/icons/no.svg";
  return "/icons/gender-unspecified.svg";
}

function getAnswerIconPath(label) {
  const key = String(label || "").toLowerCase();
  if (key.includes("energy")) return "/icons/energy.svg";
  if (key.includes("lifestyle")) return "/icons/lifestyle.svg";
  if (key.includes("rest") || key.includes("sleep")) return "/icons/rest.svg";
  if (key.includes("focus") || key.includes("memory") || key.includes("concentration")) return "/icons/memory.svg";
  if (key.includes("immunity") || key.includes("immune")) return "/icons/immunity.svg";
  if (key.includes("hair")) return "/icons/hair.svg";
  if (key.includes("skin")) return "/icons/skin.svg";
  if (key.includes("joint")) return "/icons/joint.svg";
  if (key.includes("aging")) return "/icons/aging.svg";
  if (key.includes("perform") || key.includes("endurance")) return "/icons/endurance.svg";
  if (key.includes("positive") || key.includes("mood")) return "/icons/positive.svg";
  if (key.includes("gut") || key.includes("digest")) return "/icons/digestion.svg";
  if (key.includes("cardio") || key.includes("heart") || key.includes("cardiovascular")) return "/icons/heart.svg";
  if (key.includes("menstrual")) return "/icons/menstrual.svg";
  if (key.includes("menopause")) return "/icons/menopause.svg";
  if (key.includes("libido")) return "/icons/libido.svg";

  // exercise set
  if (key.includes("running")) return "/icons/running.svg";
  if (key.includes("weights") || key.includes("strength")) return "/icons/weights.svg";
  if (key.includes("classes") || key.includes("class")) return "/icons/classes.svg";
  if (key.includes("sports") || key.includes("sport")) return "/icons/sports.svg";
  if (key.includes("crossfit")) return "/icons/crossfit.svg";
  if (key.includes("boxing")) return "/icons/boxing.svg";
  if (key.includes("walking") || key.includes("walk")) return "/icons/walking.svg";
  if (key.includes("other")) return "/icons/other.svg";
  if (key.includes("none") || key === "no") return "/icons/cross.svg";
  if (key === "yes") return "/icons/yes.svg";
  if (key.includes("sometimes") || key.includes("maybe")) return "/icons/maybe.svg";

  return "/icons/sparkles.svg"; // fallback
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
function titleIncludes(q, substr) {
  if (!q || !q.title) return false;
  return String(q.title).toLowerCase().includes(String(substr).toLowerCase());
}
function isNo(val) {
  return String(val ?? "").toLowerCase() === "no";
}

// ---- generic answer chip (legacy multi)
function AnswerChip({ selected, children, onClick, kiosk }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      className={`flex items-center justify-between w-full ${kiosk ? "p-6 text-xl" : "p-4 text-base"} 
        rounded-2xl border mb-3 text-left`}
      style={{
        borderColor: selected ? BRAND.text : BRAND.border,
        boxShadow: selected ? `0 0 0 3px ${BRAND.text}33` : "none",
        color: BRAND.text,
        background: "transparent",
      }}
    >
      <span>{children}</span>
      <span aria-hidden>{selected ? "✓" : ""}</span>
    </button>
  );
}

// ---- Single-select icon tiles (centered, 4 per row max)
function PeriodicOptions({ options, value, onChange, kiosk, getIconPath = getAnswerIconPath }) {
  const iconSize = kiosk ? 88 : 72;
  return (


    <div
      role="radiogroup"
      className="grid gap-4 justify-center
    [grid-template-columns:repeat(auto-fit,minmax(280px,280px))]
    max-w-[calc(4*280px+3*1rem)]"
      style={{
        width: "90vw",
        maxWidth: "90vw",
        marginInline: "auto",
        boxSizing: "border-box",
	justifyContent: "center"
      }}
    >
      {(options || []).map((opt, i) => {
        const sel = value === opt.id;
        const col = PERIODIC_PALETTE[i % PERIODIC_PALETTE.length];
        const iconPath = getIconPath ? getIconPath(opt.label) : null;

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
              <div
                className="rounded-2xl shrink-0 grid place-items-center"
                style={{ width: iconSize, height: iconSize, background: col.bg }}
                aria-hidden="true"
              >
                {iconPath && (
                  <img
                    src={iconPath}
                    alt=""
                    draggable="false"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                    style={{ width: Math.round(iconSize * 0.7), height: Math.round(iconSize * 0.7), objectFit: "contain" }}
                  />
                )}
              </div>
              <div className={`${kiosk ? "text-2xl" : "text-xl"} font-semibold leading-snug`}>{opt.label}</div>
            </div>

            {sel && (
              <div
                aria-hidden
                className="absolute top-3 right-3 rounded-full"
                style={{
                  width: kiosk ? 26 : 22,
                  height: kiosk ? 26 : 22,
                  border: "2px solid rgba(21,50,71,.9)",
                  background: "rgba(255,255,255,.9)",
                  display: "grid",
                  placeItems: "center",
                  fontSize: kiosk ? 14 : 12,
                  color: "#153247",
                  fontWeight: 800,
                }}
              >
                ✓
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ---- Multi-select icon tiles (limit 2)
function PeriodicOptionsMulti({ options, values = [], onToggle, kiosk, maxSelect = 2 }) {
  const selectedSet = new Set(values);
  const disabledAll = values.length >= maxSelect;
  const iconSize = kiosk ? 88 : 72;

  return (
    <div
      role="group"
      className="grid gap-4 justify-items-stretch grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
      style={{ width: "90vw", maxWidth: "90vw", marginInline: "auto", boxSizing: "border-box" }}
    >
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
            className={`relative w-full rounded-3xl transition-all text-left
                        focus:outline-none focus-visible:ring-4 focus-visible:ring-offset-2
                        ${canClick ? "cursor-pointer" : "opacity-60 cursor-not-allowed"}`}
            style={{
              background: TILE.bg,
              border: `2px solid ${sel ? TILE.borderActive : TILE.border}`,
              boxShadow: sel ? TILE.shadowActive : TILE.shadow,
              transform: sel ? "translateY(-1px)" : "none",
              color: BRAND.text,
            }}
          >
            <div className="flex items-center gap-5" style={{ padding: kiosk ? 24 : 18 }}>
              <div
                className="rounded-2xl shrink-0 grid place-items-center"
                style={{ width: iconSize, height: iconSize, background: col.bg }}
                aria-hidden="true"
              >
                {iconPath && (
                  <img
                    src={iconPath}
                    alt=""
                    draggable="false"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                    style={{
                      width: Math.round(iconSize * 0.7),
                      height: Math.round(iconSize * 0.7),
                      objectFit: "contain",
                      display: "block",
                    }}
                  />
                )}
              </div>

              <div className={`${kiosk ? "text-2xl" : "text-xl"} font-semibold leading-snug`}>{opt.label}</div>
            </div>

            {sel && (
              <div
                aria-hidden
                className="absolute top-3 right-3 rounded-full"
                style={{
                  width: kiosk ? 26 : 22,
                  height: kiosk ? 26 : 22,
                  border: "2px solid rgba(21,50,71,.9)",
                  background: "rgba(255,255,255,.9)",
                  display: "grid",
                  placeItems: "center",
                  fontSize: kiosk ? 14 : 12,
                  color: "#153247",
                  fontWeight: 800,
                }}
              >
                ✓
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ---- Priorities = Multi with icons (max 2) – just reuse above
const PeriodicOptionsMultiWithIcons = PeriodicOptionsMulti;

// ---- Main
export default function QuizClient() {
  const { get } = useQueryParams();
  const kiosk = get("kiosk", "0") === "1";
  const context = get("context", "default");

  useAutoResize();

  // Idle
  const [idle, setIdle] = useState(true);
  const idleTimer = useRef(null);
  const IDLE_MS = kiosk ? 30000 : 120000;

  // Steps / data
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [error, setError] = useState(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});

  const resetAll = useCallback(() => {
    setAnswers({});
    setStep(0);
  }, []);

  const bumpIdle = useCallback(() => {
    setIdle(false);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      setIdle(true);
      resetAll();
    }, IDLE_MS);
  }, [IDLE_MS, resetAll]);

  useEffect(() => {
    const onAny = () => bumpIdle();
    ["pointerdown", "keydown", "touchstart"].forEach((ev) => window.addEventListener(ev, onAny));
    bumpIdle();
    return () => ["pointerdown", "keydown", "touchstart"].forEach((ev) => window.removeEventListener(ev, onAny));
  }, [bumpIdle]);

  const FALLBACK = [
    {
      id: "goal",
      title: "What's your primary goal?",
      type: "single",
      options: ["Energy", "Immunity", "Skin & Hair", "Sleep"],
      required: true,
    },
  ];

  // Load questions + robust type normalization
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/boots_quiz_questions.json", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const src = Array.isArray(data) ? data : [];

        const transformed = src.map((q, i) => {
  const opts = normalizeOptionsFromAny(q, i);

  const t = String(q.type || "").toLowerCase();
  const typeMap = { slider: "slider", range: "slider", scale: "slider", likert: "slider" };

  // infer slider if no options and has min/max labels
  const inferred = !t && (!opts.length && (q.minLabel || q.maxLabel)) ? "slider" : (opts.length ? "single" : "single");

  let qtype = typeMap[t] || inferred;

  // 🔒 hard guard: ensure the “How active…” question is always a slider
  const qid = String(q.id ?? `q_${i}`);
  if (qid === "feeling_activity_levels") {
    qtype = "slider";
  }

  return {
    id: qid,
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
        if (!cancelled) {
          setError(String(e?.message || e));
          setQuestions(FALLBACK);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const total = questions.length;
  const current = step === 0 ? null : questions[step - 1];
  const isResults = step > total;

  function setAnswer(qid, value, mode = "single") {
    setAnswers((prev) => {
      const next = { ...prev };
      if (mode === "multi") {
        const set = new Set(Array.isArray(prev[qid]) ? prev[qid] : []);
        set.has(value) ? set.delete(value) : set.add(value);
        next[qid] = Array.from(set);
      } else if (mode === "multi-limit-2") {
        const set = new Set(Array.isArray(prev[qid]) ? prev[qid] : []);
        if (set.has(value)) set.delete(value);
        else if (set.size < 2) set.add(value);
        next[qid] = Array.from(set);
      } else {
        next[qid] = value;
      }
      return next;
    });
  }

  function canContinue() {
    if (step === 0) return true;
    if (!current) return true;
    if (current.type === "slider") return true;
    if (current.required === false) return true;
    const v = answers[current.id];
    if (isExercise(current)) return Array.isArray(v) && v.length > 0;
    if (isPriorities(current)) return Array.isArray(v) && v.length > 0 && v.length <= 2;
    return current.type === "multi" ? true : Boolean(v);
  }

  // Identify special titles
  const isSpecificDiet = (q) => titleIncludes(q, "specific diet");
  const isWhichDiet = (q) => titleIncludes(q, "which diet");
  const isProcessed = (q) => titleIncludes(q, "how often do you consume processed food") || titleIncludes(q, "how often do you eat processed");
  const isExercise = (q) => titleIncludes(q, "when you exercise") || titleIncludes(q, "what kind of exercise");
  const isPriorities = (q) =>
    String(q?.title || "") === "Which of the below are your top two priorities in the upcoming months?";
  const isActiveWeek = (q) => titleIncludes(q, "how active are you in a typical week");
  const isGender = (q) => /are you\b|gender/i.test(q?.title || "");

  // Next with conditional skip (diet)
  const goNext = () => {
    setStep((s) => {
      if (s >= total) return total + 1;
      const currIndex = s - 1;
      const currQ = questions[currIndex];
      let nextStep = s + 1;

      if (currQ && isSpecificDiet(currQ)) {
        const ans = answers[currQ.id];
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
        .nourished-range {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 14px;
          border-radius: 7px;
          background: #ffffff;
          outline: none;
        }
        .nourished-range:focus {
          outline: none;
        }
        .nourished-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: ${BRAND.text};
          border: 2px solid #fff;
          box-shadow: 0 0 0 2px ${BRAND.text};
          cursor: pointer;
          margin-top: -9px;
        }
        .nourished-range::-webkit-slider-runnable-track {
          height: 14px;
          border-radius: 7px;
          background: transparent;
        }
        .nourished-range::-moz-range-thumb {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: ${BRAND.text};
          border: 2px solid #fff;
          box-shadow: 0 0 0 2px ${BRAND.text};
          cursor: pointer;
        }
        .nourished-range::-moz-range-track {
          height: 14px;
          border-radius: 7px;
          background: transparent;
        }
        .nourished-range::-ms-thumb {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: ${BRAND.text};
          border: 2px solid #fff;
          box-shadow: 0 0 0 2px ${BRAND.text};
          cursor: pointer;
        }
        .nourished-range::-ms-track {
          height: 14px;
          border-radius: 7px;
          background: transparent;
          border-color: transparent;
          color: transparent;
        }
      `}</style>

      {/* idle attract */}
      {kiosk && idle && !isResults && (
        <AttractScreen
          kiosk={kiosk}
          onStart={() => {
            setIdle(false);
            setAnswers({});
            setStep(1);
          }}
        />
      )}

      {/* main */}
      {!isResults && !idle && (
        <>
          {step === 0 ? (
            <Stage kiosk={kiosk}>
              <div style={{ textAlign: "center" }}>
                <img
                  src="/nourished-formula-logo.svg"
                  alt="Nourished Formula"
                  className="h-auto mx-auto mb-6"
                  draggable="false"
                  style={{ width: "min(66%, 480px)", marginBottom: "8%" }}
                />
                <h1 className={kiosk ? "text-5xl" : "text-4xl"} style={{ fontWeight: 700, marginBottom: 12 }}>
                  Find your perfect stack
                </h1>
                <p className={kiosk ? "text-xl" : "text-lg"} style={{ opacity: 0.85, marginBottom: 24 }}>
                  Answer a few quick questions and we’ll match you to the right Nourished formula.
                </p>
                <div className="mx-auto" style={{ maxWidth: 360 }}>
                  <Button kiosk={kiosk} onClick={() => setStep(1)} bg="#e2c181" textColor="#153247">
                    Get Started
                  </Button>
                </div>
                <p style={{ fontWeight: 300, marginTop: 40, fontSize: 12 }}>
                  Please note: This quiz is designed to help you select a personalised vitamin stack based on your
                  lifestyle and wellness goals. It is not intended to diagnose or treat any medical condition. If you
                  are pregnant, breastfeeding, taking medication or under medical supervision, please consult a
                  healthcare professional before taking any supplements.
                </p>
              </div>
            </Stage>
          ) : (
            <Stage kiosk={kiosk}>
              {!loading && current && (
                <section style={{ width: "90vw", maxWidth: "90vw", marginInline: "auto" }}>
                  {/* Titles */}
                  {isProcessed(current) ? (
                    <>
                      <h2
                        className={kiosk ? "text-5xl" : "text-3xl"}
                        style={{ fontWeight: 700, marginBottom: kiosk ? 12 : 10, textAlign: "center", lineHeight: 1.15 }}
                      >
                        How often do you eat processed foods in a typical day?
                      </h2>
                      <p
                        style={{
                          textAlign: "center",
                          opacity: 0.75,
                          fontSize: kiosk ? "1.25rem" : "1rem",
                          marginBottom: kiosk ? 40 : 28,
                          maxWidth: 700,
                          marginInline: "auto",
                        }}
                      >
                        For example: ready meals, crisps, biscuits, packaged snacks, sugary cereals, or processed meats
                      </p>
                    </>
                  ) : (
                    <h2
                      className={kiosk ? "text-5xl" : "text-3xl"}
                      style={{ fontWeight: 700, marginBottom: kiosk ? 36 : 28, textAlign: "center", lineHeight: 1.15 }}
                    >
                      {current.title}
                    </h2>
                  )}

                  {/* Body */}
                  {(() => {
                    // priorities (multi icons, max 2)
                    if (isPriorities(current)) {
                      const vals = Array.isArray(answers[current.id]) ? answers[current.id] : [];
                      return (
                        <PeriodicOptionsMultiWithIcons
                          options={current.answers}
                          values={vals}
                          onToggle={(id) => setAnswer(current.id, id, "multi-limit-2")}
                          kiosk={kiosk}
                          maxSelect={2}
                        />
                      );
                    }
                    // slider (robust) or specific active-week title
                    if (current.type === "slider" || isActiveWeek(current)) {
                      const val = Number(answers[current.id] || 3);
                      const fillPct = Math.max(0, Math.min(100, ((val - 1) / 4) * 100)); // 1..5 → 0..100%
                      return (
                        <div style={{ width: "90vw", maxWidth: "90vw", marginInline: "auto" }}>
                          <div
                            className="flex justify-between"
                            style={{ fontSize: kiosk ? "1.5rem" : "1.1rem", fontWeight: 700, marginBottom: 16 }}
                          >
                            <span>{current.minLabel || "Low"}</span>
                            <span>{current.maxLabel || "High"}</span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="5"
                            step="1"
                            value={val}
                            onChange={(e) => setAnswer(current.id, e.target.value, "slider")}
                            aria-label={current.title}
                            className="nourished-range"
                            style={{
                              width: "100%",
                              background: `linear-gradient(to right, ${BRAND.text} 0%, ${BRAND.text} ${fillPct}%, #ffffff ${fillPct}%, #ffffff 100%)`,
                            }}
                          />
                        </div>
                      );
                    }

                    // gender → single with gender icons
                    if (isGender(current)) {
                      return (
                        <PeriodicOptions
                          options={current.answers}
                          value={answers[current.id] || ""}
                          onChange={(val) => setAnswer(current.id, val, "single")}
                          kiosk={kiosk}
                          getIconPath={getGenderIconPath}
                        />
                      );
                    }

                    // processed → single tiles
                    if (isProcessed(current)) {
                      return (
                        <PeriodicOptions
                          options={current.answers}
                          value={answers[current.id] || ""}
                          onChange={(val) => setAnswer(current.id, val, "single")}
                          kiosk={kiosk}
                        />
                      );
                    }

                    // exercise → multi (max 2)
                    if (isExercise(current)) {
                      const vals = Array.isArray(answers[current.id]) ? answers[current.id] : [];
                      return (
                        <PeriodicOptionsMulti
                          options={current.answers}
                          values={vals}
                          onToggle={(id) => setAnswer(current.id, id, "multi-limit-2")}
                          kiosk={kiosk}
                          maxSelect={2}
                        />
                      );
                    }



                    // default multi (legacy chips)
                    if (current.type === "multi") {
                      return (
                        <div
                          role="group"
                          aria-labelledby={`q-${current.id}`}
                          style={{ width: "90vw", maxWidth: "90vw", marginInline: "auto" }}
                        >
                          {(current.answers || []).map((a) => {
                            const selected = (answers[current.id] || []).includes(a.id);
                            return (
                              <AnswerChip
                                key={a.id}
                                kiosk={kiosk}
                                selected={selected}
                                onClick={() => setAnswer(current.id, a.id, "multi")}
                              >
                                {a.label}
                              </AnswerChip>
                            );
                          })}
                        </div>
                      );
                    }

                    // default single → icon tiles
                    return (
                      <PeriodicOptions
                        options={current.answers}
                        value={answers[current.id] || ""}
                        onChange={(val) => setAnswer(current.id, val, "single")}
                        kiosk={kiosk}
                      />
                    );
                  })()}

                  {/* nav */}
                  <div
                    className="mt-6 grid grid-cols-2 gap-3"
                    style={{ width: "min(720px, 90vw)", marginInline: "auto" }}
                  >
                    <Button kiosk={kiosk} onClick={goBack} disabled={step === 0}>
                      Back
                    </Button>
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
      {isResults && (
        <Stage kiosk={kiosk}>
          <div style={{ width: "90vw", maxWidth: "90vw", marginInline: "auto", textAlign: "center" }}>
            <h2 className={kiosk ? "text-3xl" : "text-2xl"} style={{ fontWeight: 600, marginBottom: 16 }}>
              Your recommendation
            </h2>
            <div style={{ marginBottom: 16, opacity: 0.85 }}>
              Coming Soon — your personalised result will appear here once scoring is connected.
            </div>
            <div className="grid gap-3" style={{ width: "min(520px, 90vw)", marginInline: "auto" }}>
              <Button
                kiosk={kiosk}
                onClick={() => {
                  setAnswers({});
                  setStep(0);
                  setIdle(false);
                }}
              >
                Restart
              </Button>
              <Button
                kiosk={kiosk}
                onClick={() => {
                  postToParent({ type: "NOURISHED_QUIZ_EVENT", event: "cta_clicked" });
                  alert("CTA clicked. In production, deep-link or let host handle.");
                }}
              >
                Continue
              </Button>
            </div>
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
