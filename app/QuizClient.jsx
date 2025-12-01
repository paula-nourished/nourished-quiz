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

// ---- scoring config
const WEIGHTS_URL = "boots_quiz_weights.json"; // put the JSON file in /public

// Stable order for tie-breaking
const PRODUCT_ORDER = ["Eic","Epi","Meca","Ecp","Cpe","Hcp","Hpes","Rnp","Bmca","Mjb","Spe","Shp","Gsi"];

// ---- product display metadata (code -> display)
const PRODUCT_META = {
Ecp: { name: "Ecp", title: "Energy • Cognitive Function • Psychological Function", blurb: "We recommend the ECP formula, precision nutrition formulated to support energy¹,², cognitive function³ & psychological function⁴", images: { exploded: "products/Ecp-3.jpg", pack: "products/Ecp-1.png" } },
	
Eic: { name: "Eic", title: "Energy • Immunity • Cognitive Function", blurb: "We recommend the EIC formula, precision nutrition formulated to support energy¹,², immunity³ & cognitive function⁴", images:{ exploded:"products/Eic-3.jpg", pack:"products/Eic-1.png" } },
	
Mjb: { name: "Mjb", title: "Muscles • Joints • Bones", blurb: "We recommend the MJB formula, precision nutrition formulated to support muscle health¹, joint health² & bone health³", images:{ exploded:"products/Mjb-3.jpg", pack:"products/Mjb-1.png" } },
	
Bmca: { name: "Bmca", title: "Bone Health • Metabolism • Cardiovascular Health", blurb: "We recommend the BMCA formula, precision nutrition formulated to support bone health¹, muscle health² & cardiovascular health³,⁴", images:{ exploded:"products/Bmca-3.jpg", pack:"products/Bmca-1.png" } },
	
Cpe: { name: "Cpe", title: "Cognitive Function • Psychological Function • Energy", blurb: "We recommend the CPE formula, precision nutrition formulated to support cognitive function¹, psychological function²& energy³,⁴", images:{ exploded:"products/Cpe-3.jpg", pack:"products/Cpe-1.png" } },
	
Epi: { name: "Epi", title: "Energy • Psychological Function • Immunity", blurb: "We recommend the EPI formula, precision nutrition formulated to support energy¹, psychological function² & immunity³", images:{ exploded:"products/Epi-3.jpg", pack:"products/Epi-1.png" } },
	
Gsi: { name: "Gsi", title: "Gut Health • Skin Health • Immunity", blurb: "We recommend the GSI formula, precision nutrition formulated to support collagen formation¹, oxidative stress² & a healthy immune system³", images:{ exploded:"products/Gsi-3.jpg", pack:"products/Gsi-1.png" } },
	
Hcp: { name: "Hcp", title: "Hormonal Balance • Cognitive Function • Psychological Function", blurb: "We recommend the HCP formula, precision nutrition formulated to support hormone regulation¹,cognitive function², bone health³ & combat tiredness & fatigue⁴", images:{ exploded:"products/Hcp-3.jpg", pack:"products/Hcp-1.png" } },
	
Hpes: { name: "Hpes", title: "Hormonal Balance • Psychological Function • Energy", blurb: "We recommend the HPES formula, precision nutrition formulated to support psychological function¹, energy² & collagen formation for healthy hair, skin & nails³,⁴", images:{ exploded:"products/Hpes-3.jpg", pack:"products/Hpes-1.png" } },
	
Meca: { name: "Meca", title: "Metabolism • Energy • Cardiovascular Health", blurb: "We recommend the MECA formula, precision nutrition formulated to support metabolic health¹, energy²,³ & cardiovascular health⁴", images:{ exploded:"products/Meca-3.jpg", pack:"products/Meca-1.png" } },
	
Rnp: { name: "Rnp", title: "Recovery • Nervous System • Psychological Function", blurb: "We recommend the RNP formula, precision nutrition formulated to support tiredness & fatigue¹, the nervous system² & psychological function³", images:{ exploded:"products/Rnp-3.jpg", pack:"products/Rnp-1.png" } },

Shp: { name: "Shp", title: "Skin Health • Hormonal Balance • Psychological Function", blurb: "We recommend the SHP formula, precision nutrition formulated to support collagen formation¹, healthy hair² & psychological function³", images:{ exploded:"products/Shp-3.jpg", pack:"products/Shp-1.png" } },

Spe: { name: "Spe", title: "Skin Health • Psychological Function • Energy", blurb: "We recommend the SPE formula, precision nutrition formulated to support collagen formation¹, psychological function² & reduce tiredness & fatigue³", images:{ exploded:"products/Spe-3.jpg", pack:"products/Spe-1.png" } },
	
  // ...
};

// optional logo (already have this in /public)
const LOGO_SRC = "/nourished-formula-logo.svg";

// Must exactly match the priorities question title in the sheet/weights JSON
const PRIORITIES_TITLE = "What are your top two wellness priorities at the moment?";
const isPriorities = (q) =>
  String(q?.title || "").trim().toLowerCase() === PRIORITIES_TITLE.trim().toLowerCase();


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
        paddingBlock: kiosk ? 16 : 16,
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
        <p className={kiosk ? "text-xl" : "text-xl"} style={{ color: BRAND.text, opacity: 0.85, marginBottom: 24 }}>
          Answer a few quick questions and we’ll match you to the right Nourished formula.  Takes less than two minutes — quick, easy, and personalised to you.
        </p>
        <div className="mx-auto" style={{ maxWidth: 360 }}>
          <Button kiosk={kiosk} onClick={onStart} bg="#e2c181" textColor="#153247">
            Get Started
          </Button>
        </div>
        <p className="mt-10 text-sm px-[10%]" style={{ color: BRAND.text, opacity: 0.85, marginBottom: 24 }}>
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
  return "/icons/none.svg";
}

function getAnswerIconPath(label) {
  const key = String(label || "").toLowerCase();
  if (key.includes("energy")) return "/icons/energy.svg";
  if (key.includes("lifestyle")) return "/icons/lifestyle.svg";
  if (key.includes("rested") || key.includes("sleep")) return "/icons/rest.svg";
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
  if (key.includes("weight")) return "/icons/weight.svg";
  if (key.includes("stress")) return "/icons/stress.svg";
	
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

  return "/icons/none.svg"; // fallback
}

// ---- helpers
function normalizeOptionsFromAny(q, idx) {
  let raw = q.options ?? q.answers ?? q.choices ?? [];
  if (typeof raw === "string") {
    raw = raw.split(/[,;|]/g).map((s) => s.trim()).filter(Boolean);
  }

  // 1. Strings → extract ( ... ) into sublabel
  if (Array.isArray(raw) && raw.every(v => typeof v === "string")) {
    const result = raw.map((s) => {
      const match = s.match(/^(.*?)\s*\((.*?)\)\s*$/);
      const label = match ? match[1].trim() : s.trim();
      const sublabel = match ? `e.g. ${match[2].trim()}` : null;
      return { id: s, label, sublabel };
    });
    console.log("string branch output", q.id, result);
    return result;
  }

  // 2. Objects → keep any sublabel if it exists
  if (Array.isArray(raw) && raw.length && typeof raw[0] === "object") {
    const result = raw.map((o, i) => {
      const id = String(o.id ?? o.value ?? o.code ?? o.label ?? `${idx}_${i}`);
      const label = String(o.label ?? o.name ?? o.text ?? o.value ?? o.id ?? id);
      const sublabel = typeof o.sublabel === "string" ? o.sublabel : null;
      return { id, label, sublabel };
    });
    console.log("object branch output", q.id, result);
    return result;
  }

  console.log("normalizeOptionsFromAny (fallback)", q.id, raw);
  return [];
}
function titleIncludes(q, substr) {
  if (!q || !q.title) return false;
  return String(q.title).toLowerCase().includes(String(substr).toLowerCase());
}
function isNo(val) {
  return String(val ?? "").toLowerCase() === "no";
}

// ---- scoring helpers
function buildOptionLabelIndex(questions) {
  // title -> { id -> label }
  const index = {};
  (questions || []).forEach((q) => {
    const map = {};
    (q.answers || []).forEach((a) => {
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
  const add = (code, n = 1) => {
    if (!code) return;
    tallies[code] = (tallies[code] || 0) + n;
  };

  const labelIndex = buildOptionLabelIndex(questions);

  Object.keys(weightsMap || {}).forEach((title) => {
    const optionMap = weightsMap[title] || {};           // { "Really tired": ["Ecp"], ... }
    let chosen = answers[title];                          // could be id, label, array, or number (slider)
    if (chosen == null) return;

    // Helper: map an ID to its LABEL for this title (if needed)
    const idToLabel = (v) => {
      const vStr = String(v);
      // If the weights already have vStr as a label key, keep it
      if (Object.prototype.hasOwnProperty.call(optionMap, vStr)) return vStr;
      // Otherwise, try translate id -> label via questions
      const map = labelIndex[title] || {};
      return map[vStr] || vStr;
    };

    // SLIDER mapping: numbers 1..5 need bucketing to the *first/last* weighted option
    const mapSliderNumberToLabel = (num) => {
      const keys = Object.keys(optionMap);
      if (!keys.length) return null;
      const low = keys[0];
      const high = keys[keys.length - 1];
      const n = Number(num);
      if (Number.isNaN(n)) return null;
      if (n <= 2) return low;      // lean to "low" end label (e.g., "Really tired")
      if (n >= 4) return high;     // lean to "high" end label (e.g., "Full of beans")
      return null;                 // middle (3) contributes nothing unless you want neutral weight
    };

    // Normalise chosen into an array of *labels* that exist in optionMap
    let labels = [];
    if (Array.isArray(chosen)) {
      labels = chosen.map(idToLabel).filter((lab) => optionMap[lab]);
    } else if (typeof chosen === "number" || /^[0-9]+$/.test(String(chosen))) {
      const lab = mapSliderNumberToLabel(chosen);
      if (lab && optionMap[lab]) labels = [lab];
    } else {
      const lab = idToLabel(chosen);
      if (optionMap[lab]) labels = [lab];
    }

    // Add weights for each mapped label
    labels.forEach((lab) => (optionMap[lab] || []).forEach((code) => add(code, 1)));
  });

  return tallies; // e.g. { Eic: 3, Mjb: 2, ... }
}

// ---- choose the winning product code from tallies (priority answer tie-break)
function pickWinner(tallies = {}, answers = {}, weightsMap = {}, questions = []) {
  // 1) No scores? no winner.
  const entries = Object.entries(tallies).filter(([, v]) => v > 0);
  if (!entries.length) return null;

  // 2) Highest score first
  const max = Math.max(...entries.map(([, v]) => v));
  let candidates = entries.filter(([, v]) => v === max).map(([code]) => code);

  if (candidates.length === 1) return candidates[0];

  // 3) PRIORITY TIE-BREAK: use the selected priority and its mapping in weights JSON
  const priTitle = Object.keys(weightsMap || {}).find(
    (t) => t.trim().toLowerCase() === PRIORITIES_TITLE.trim().toLowerCase()
  ) || PRIORITIES_TITLE;

  // look up the priorities question (to translate id -> label if needed)
  const priQ = (questions || []).find(
    (q) => String(q?.title || "").trim().toLowerCase() === String(priTitle).trim().toLowerCase()
  );

  // retrieve the stored answer (we save under both id and title)
  let raw = answers[priTitle];
  if (raw == null && priQ) raw = answers[priQ.id];

  // normalise to a single label
  let priLabel = null;
  if (Array.isArray(raw)) raw = raw[0];        // legacy safety; you now use single-select
  if (raw != null) {
    const s = String(raw);
    // if it's already a label present in the weights, keep it
    if (weightsMap?.[priTitle] && Object.prototype.hasOwnProperty.call(weightsMap[priTitle], s)) {
      priLabel = s;
    } else if (priQ) {
      // translate id -> label via the question's answers
      const hit = (priQ.answers || []).find((a) => String(a.id) === s);
      if (hit?.label) priLabel = String(hit.label);
    }
  }

  // if we got a valid priority label, narrow candidates to SKUs mapped by that label
  if (priLabel && weightsMap?.[priTitle]?.[priLabel]) {
    const prefer = new Set(weightsMap[priTitle][priLabel]);
    const narrowed = candidates.filter((c) => prefer.has(c));
    if (narrowed.length === 1) return narrowed[0];
    if (narrowed.length > 1) candidates = narrowed; // still tied, but now only amongst preferred SKUs
  }

  // 4) Stable product order tie-break
  const orderIndex = (code) => {
    const i = PRODUCT_ORDER.indexOf(code);
    return i === -1 ? Number.POSITIVE_INFINITY : i;
  };
  candidates.sort((a, b) => orderIndex(a) - orderIndex(b));

  // 5) Lexicographic as final fallback
  candidates.sort((a, b) => {
    const oa = orderIndex(a);
    const ob = orderIndex(b);
    if (oa !== ob) return oa - ob;
    return a.localeCompare(b);
  });

  return candidates[0] || null;
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
  const iconSize = kiosk ? 60 : 40;
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
            <div className="flex items-center gap-5" style={{ padding: kiosk ? 16: 10 }}>
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
					  className="filter invert brightness-0"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                    style={{ width: Math.round(iconSize * 0.7), height: Math.round(iconSize * 0.7), objectFit: "contain" }}
                  />
                )}
              </div>
              <div className="flex flex-col leading-snug">
  <span className={`${kiosk ? "text-2xl" : "text-xl"} font-semibold`}>{opt.label}</span>
  {opt.sublabel && <span className="text-xs text-slate-500 mt-1">{opt.sublabel}</span>}
</div>
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
  const iconSize = kiosk ? 60 : 40;

  return (
    <div
      role="group"
      className="grid gap-4 justify-items-stretch grid-cols-1 sm:grid-cols-2 md:grid-cols-3"
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
            <div className="flex items-center gap-5" style={{ padding: kiosk ? 18 : 10 }}>
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
					  className="filter invert brightness-0"
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

<div className="flex flex-col leading-snug">
  <span className={`${kiosk ? "text-2xl" : "text-xl"} font-semibold`}>{opt.label}</span>
  {opt.sublabel && <span className="text-xs text-slate-500 mt-1">{opt.sublabel}</span>}
</div>
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
// ---- Multi-select icon tiles (limit 2 with priority)
function PeriodicOptionsPriority({ options, values = [], onToggle, kiosk, maxSelect = 2 }) {
  const selectedSet = new Set(values);
  const disabledAll = values.length >= maxSelect;
  const iconSize = kiosk ? 60 : 40;

  return (
    <div
      role="group"
      className="grid gap-4 justify-items-stretch grid-cols-1 sm:grid-cols-2 md:grid-cols-3"
      style={{ width: "90vw", maxWidth: "90vw", marginInline: "auto", boxSizing: "border-box" }}
    >
      {(options || []).map((opt, i) => {
        const index = values.indexOf(opt.id);
        const sel = index !== -1;
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
            <div className="flex items-center gap-5" style={{ padding: kiosk ? 18 : 10 }}>
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
                    className="filter invert brightness-0"
                    onError={(e) => (e.currentTarget.style.display = "none")}
                    style={{
                      width: Math.round(iconSize * 0.7),
                      height: Math.round(iconSize * 0.7),
                      objectFit: "contain",
                      display: "block",
                    }}
                  />
                )}
              </div>

              <div className="flex flex-col leading-snug">
                <span className={`${kiosk ? "text-2xl" : "text-xl"} font-semibold`}>
                  {opt.label}
                </span>
                {opt.sublabel && (
                  <span className="text-xs text-slate-500 mt-1">{opt.sublabel}</span>
                )}
              </div>
            </div>

            {sel && (
              <div
                aria-hidden
                className="absolute top-3 right-3 rounded-full bg-white"
                style={{
                  width: kiosk ? 26 : 22,
                  height: kiosk ? 26 : 22,
                  border: "2px solid rgba(21,50,71,.9)",
                  display: "grid",
                  placeItems: "center",
                  fontSize: kiosk ? 14 : 12,
                  color: "#153247",
                  fontWeight: 800,
                }}
              >
                {index + 1}
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

function ProductResultView({ code, tallies, kiosk }) {
  const meta = PRODUCT_META[code] || {
    name: code,
    subtitle: "",
    blurb: "Your personalised recommendation based on your answers.",
    images: { exploded: "/fallback-exploded.png", pack: "/fallback-pack.png" },
  };

  // non-zero counts, sorted desc
  const counts = Object.entries(tallies)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);

  return (
    <div
      className="rounded-[28px] border p-6 md:p-14"
      style={{ borderColor: BRAND.border, background: "rgba(255,255,255,.92)" }}
    >


      {/* Two-column body: exploded left, pack right */}
      <div className="grid gap-6 md:gap-10 md:grid-cols-2 items-center">
        {/* Left: exploded + blurb + counts */}
		  
        <div className="order-2 md:order-1">
		<img src={LOGO_SRC} alt="Nourished formulaic" className="h-7 md:h-14" />	
			{meta.blurb && (
            <p className="mt-6 text-base md:text-lg text-center md:text-left" style={{ color: BRAND.text }}>
              {meta.blurb}
            </p>
		
          )}
			<p
  className="mt-6 text-lg text-center font-medium border rounded-2xl px-4 py-3 inline-block mx-auto"
  style={{
    color: "#153247",
    opacity: 0.9,
    borderColor: "#d6d1c9",
    background: "rgba(255,255,255,0.85)",
  }}
>
 Find <strong>{meta.name}</strong> on the shelf below to start your wellness journey today.
</p>
          <img
            src={meta.images.exploded}
            alt={`${meta.name} exploded stack`}
            className="w-full h-auto rounded-2xl"
            onError={(e) => (e.currentTarget.style.display = "none")}
          />

          {/* Compact counts line + neat list */}
          {counts.length > 0 && (
            <div className="w-full mt-3">
              <div className="text-sm opacity-80 text-center md:text-left">
                {counts.map(([c, v], i) => (
                  <span key={c}>
                    {c} {v}
                    {i < counts.length - 1 ? " • " : ""}
                  </span>
                ))}
              </div>
             
            </div>
          )}
        </div>

        {/* Right: pack shot */}
        <div className="order-1 md:order-2 flex justify-center md:justify-end">
          <img
            src={meta.images.pack}
            alt={`${meta.name} pack`}
            className="w-full h-auto rounded-2xl"
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
        </div>
      </div>
    </div>
  );
}

// ---- Boots URL map (SKU → product page) ADDED FOR ONLINE ONLY
const BOOTS_URLS = {
  BMCA: "https://www.boots.com/nourished-bmca-nutrient-stacks-30-gummies-10378545",
  CPE:  "https://www.boots.com/nourish3d-cpe-nutrient-stacks-30-gummies-10378546",
  ECP:  "https://www.boots.com/nourish3d-ecp-nutrient-stacks-30-gummies-10378547",
  EIC:  "https://www.boots.com/nourish3d-eic-nutrient-stacks-30-gummies-10378548",
  EPI:  "https://www.boots.com/nourish3d-epi-nutrient-stacks-30-gummies-10378549",
  GSI:  "https://www.boots.com/nourish3d-gsi-nutrient-stacks-30-gummies-10378550",
  HCP:  "https://www.boots.com/nourish3d-hcp-nutrient-stacks-30-gummies-10378551",
  HPES: "https://www.boots.com/nourish3d-hpes-nutrient-stacks-30-gummies-10378552",
  MECA: "https://www.boots.com/nourish3d-meca-nutrient-stacks-30-gummies-10378553",
  MJB:  "https://www.boots.com/nourish3d-mjb-nutrient-stacks-30-gummies-10378554",
  RNP:  "https://www.boots.com/nourish3d-rnp-nutrient-stacks-30-gummies-10378555",
  SHP:  "https://www.boots.com/nourish3d-shp-nutrient-stacks-30-gummies-10378556",
  SPE:  "https://www.boots.com/nourish3d-spe-nutrient-stacks-30-gummies-10378557"
};

// ---- Main
export default function QuizClient() {
  const { get } = useQueryParams();
  const kiosk = get("kiosk", "0") === "1";
  const context = get("context", "default");
  const [weights, setWeights] = useState({});
	
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
    setStep(0); // ensure it always returns to intro
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

// ---- Load weightings JSON for scoring (with error logging)
useEffect(() => {
  let cancelled = false;
  (async () => {
    try {
      const res = await fetch(WEIGHTS_URL, { cache: "no-store" });
      if (!res.ok) throw new Error(`weights fetch HTTP ${res.status} at ${WEIGHTS_URL}`);
      const w = await res.json();
      if (!cancelled) setWeights(w || {});
    } catch (e) {
      console.warn("⚠️ Failed to load weights:", e);
      if (!cancelled) setWeights({});
    }
  })();
  return () => { cancelled = true; };
}, []);


const total = Array.isArray(questions) ? questions.length : 0;
const isLoading = total === 0;                 // guard while questions load
const isResults = total > 0 && step > total;   // only show results when we have questions
const current = step === 0 ? null : questions[step - 1];

	useEffect(() => {
  if (total === 0) return;
  const maxStep = total + 1; // +1 is results page
  if (step < 0 || step > maxStep) setStep(0);
}, [total, step]);

function setAnswer(qid, value, mode = "single") {
  setAnswers((prev) => {
    const next = { ...prev };
    const titleKey = current?.title; // current visible title

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

    // store under qid (for navigation) and under the title (for scoring)
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
    const v = answers[current.id];
    if (isExercise(current)) return Array.isArray(v) && v.length > 0;
    // if (isPriorities(current)) return Array.isArray(v) && v.length > 0 && v.length <= 2;
	if (isPriorities(current)) return Boolean(v);
    return current.type === "multi" ? true : Boolean(v);
  }

  // Identify special titles
  const isSpecificDiet = (q) => titleIncludes(q, "specific diet");
  const isWhichDiet = (q) => titleIncludes(q, "which diet");
  const isProcessed = (q) => titleIncludes(q, "how often do you consume processed food") || titleIncludes(q, "how often do you eat processed");
  const isExercise = (q) => titleIncludes(q, "when you exercise") || titleIncludes(q, "what kind of exercise");
  const isPriorities = (q) =>
    String(q?.title || "") === "What are your top two wellness priorities at the moment?";
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
          height: 34px;
          border-radius: 27px;
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

		{isLoading && (
  <Stage kiosk={kiosk}>
    <div style={{ width: "90vw", maxWidth: "90vw", marginInline: "auto", textAlign: "center" }}>
      <h2 className={kiosk ? "text-3xl" : "text-2xl"} style={{ fontWeight: 600, marginBottom: 12 }}>
        Loading quiz…
      </h2>
      <div style={{ opacity: 0.7 }}>One moment while we fetch your questions.</div>
    </div>
  </Stage>
)}
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
                  Answer a few quick questions and we’ll match you to the right Nourished formula. Takes less than two minutes — quick, easy, and personalised to you.
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
                        className={kiosk ? "text-4xl" : "text-3xl"}
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
                      className={kiosk ? "text-4xl" : "text-3xl"}
                      style={{ fontWeight: 700, marginBottom: kiosk ? 36 : 28, textAlign: "center", lineHeight: 1.15 }}
                    >
                      {current.title}
                    </h2>
                  )}

                  {/* Body */}
                  {(() => {
                    // priorities (multi icons, max 2)
                    // if (isPriorities(current)) {
                    //  const vals = Array.isArray(answers[current.id]) ? answers[current.id] : [];
                    //  return (
                    //    <PeriodicOptionsMultiWithIcons
                    //     options={current.answers}
                    //      values={vals}
                    //      onToggle={(id) => setAnswer(current.id, id, "multi-limit-2")}
                    //      kiosk={kiosk}
                    //      maxSelect={2}
                    //    />
                    //  );
                   // } 

// priorities → single-select with icons
if (isPriorities(current)) {
  const vals = Array.isArray(answers[current.id]) ? answers[current.id] : [];
  return (
    <PeriodicOptionsPriority
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
                            onChange={(e) => setAnswer(current.id, Number(e.target.value), "slider")}
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

      {(() => {
const tallies = scoreAnswers(answers, weights, questions);
const winner = pickWinner(tallies, answers, weights, questions);

        if (!winner) {
          return (
            <>
              <div
                className="mx-auto rounded-3xl border p-6"
                style={{ width: "min(560px, 92vw)", borderColor: BRAND.border }}
              >
                <div className="text-6xl font-extrabold mb-2" style={{ color: BRAND.text }}>—</div>
                <div style={{ opacity: 0.75 }}>No result yet — please answer the questions.</div>
              </div>

              {/* Bottom buttons */}
              <div className="grid gap-3 mt-6" style={{ width: "min(520px, 90vw)", marginInline: "auto" }}>
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
              </div>
            </>
          );
        }

        return (
          <>
            {/* Product card with images, blurb, and compact counts inside */}
            <ProductResultView code={winner} tallies={tallies} context={context} kiosk={kiosk} />

           {/* Bottom buttons */}
<div className="grid gap-3 mt-6" style={{ width: "min(520px, 90vw)", marginInline: "auto" }}>

  {/* Go to Boots */}
  <Button
    kiosk={kiosk}
    bg="#153247"
    textColor="#ffffff"
    onClick={() => {
      const code = winner.toUpperCase();
      const url = BOOTS_URLS[code];
      if (url) window.open(url, "_blank");
    }}
  >
    View on Boots.com
  </Button>

  {/* Restart */}
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
</div>
          </>
        );
      })()}
    </div>
  </Stage>
)}
{/* Data Privacy Notice — appears on all pages */}
<footer
  style={{
    textAlign: "center",
    fontSize: kiosk ? "1rem" : "0.9rem",
    color: BRAND.text,
    opacity: 0.75,
    padding: "2rem 1rem",
    width: "100%",
    boxSizing: "border-box",
  }}
>
  <p>
    <strong>Your privacy matters:</strong> We don’t collect or store any personal information from this quiz. All
    answers are processed anonymously to provide your results.
  </p>
</footer>


      <div className="h-4" aria-hidden />
    </div>
  );
}
