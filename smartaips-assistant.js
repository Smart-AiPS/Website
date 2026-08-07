/* ==========================================================================
   Smart AiPS — Aipsy, the site-connected assistant
   --------------------------------------------------------------------------
   Deploy:
     1. Keep assets/aipsy-mascot.webp + assets/aipsy-mascot-blink.webp
     2. Add one line before the closing body tag:
        script src="smartaips-assistant.js" defer

   What "connected" means here — Aipsy is wired into the page, not parked on it:
     • Knows which section you are reading (status line + suggestions follow you)
     • Navigates you and pulses a signal down the section rail to the target
     • Any element can talk to him:  data-aipsy-ask="How does the pilot work?"
     • Captures a lead in-chat and hands off a fully written email
     • Drop in an apiEndpoint below and he becomes a real LLM chat, same UI
   ========================================================================== */
(function () {
  "use strict";

  var CONFIG = {
    name: "Aipsy",

    assets: {
      mascot: "assets/aipsy-mascot.webp",
      blink:  "assets/aipsy-mascot-blink.webp"
    },

    /* Point this at your Lambda / API Gateway endpoint to go live.
       POST { message, history:[{role,content}], section }
       ->   { reply, target?, chips?:[{label,ask}] }
       If it errors or is blank, Aipsy falls back to the local knowledge below. */
    /* ← PASTE YOUR CLAUDE / API GATEWAY URL HERE
       Example: "https://abc123.execute-api.us-east-1.amazonaws.com/prod/chat"
       Leave empty ("") to use the built-in local knowledge only. */
    apiEndpoint: "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",

    contactEmail: "builtbyaips@gmail.com",

    showIntroGate: true,
    gateOncePerSession: true,
    gateHeadline: "Hi, I'm Aipsy",
    gateSub: "Tell me what you're trying to fix, or pick a starting point.",
    greeting: "Ook ook \uD83E\uDD8D I'm Aipsy. Ask me anything about what we build \u2014 I'll walk you to the right part of the page.",
    fallback: "I didn't catch that one. Try me on any of these:",

    /* Local knowledge, grounded in the real page copy. */
    knowledge: [
      { id: "services", target: "#services", label: "What you build",
        reply: "Three things, mainly: custom AI agents, AWS automation, and RAG knowledge systems. Highlighting them for you now.",
        chips: ["agents", "aws", "rag"],
        words: ["service", "build", "offer", "product", "what do you do", "capabilit", "solution"] },

      { id: "agents", target: "#services", label: "AI agents",
        reply: "Agents that run real work end to end \u2014 prospect research, production optimisation, customer triage, reporting. Built on Amazon Bedrock, autonomous or with a human in the loop.",
        chips: ["process", "contact"],
        words: ["agent", "autonomous", "multi-agent", "bedrock agent", "triage", "research"] },

      { id: "aws", target: "#services", label: "AWS automation",
        reply: "We wire intelligence into the systems you already run \u2014 Bedrock, Lambda, Step Functions, API Gateway. No parallel universe of new tools for your team to learn.",
        chips: ["security", "process"],
        words: ["aws", "lambda", "step function", "api gateway", "integrat", "cloud", "bedrock", "infrastructure"] },

      { id: "rag", target: "#services", label: "RAG knowledge base",
        reply: "A private knowledge base over your own documents \u2014 specs, procedures, history \u2014 that your team queries in plain language. Retrieval-augmented, so answers cite your material instead of inventing it.",
        chips: ["security", "contact"],
        words: ["rag", "knowledge", "document", "search", "retriev", "manual", "sop", "wiki", "pdf"] },

      { id: "process", target: "#how-we-work", label: "How you work",
        reply: "Discovery, then a focused pilot in 4\u20138 weeks, then full implementation, then ongoing support. You see measurable results before committing to a rollout.",
        chips: ["timeline", "contact"],
        words: ["how", "process", "step", "work with", "engage", "start", "discovery", "pilot", "approach", "method"] },

      { id: "timeline", target: "#how-we-work", label: "How long it takes",
        reply: "First value typically lands in 4\u20138 weeks. That's a working pilot in production on a narrow slice, not a slide deck.",
        chips: ["pricing", "contact"],
        words: ["how long", "timeline", "week", "fast", "quick", "when", "duration", "deadline", "eta"] },

      { id: "why", target: "#why-us", label: "Why Smart AiPS",
        reply: "Founder-led delivery, production-first engineering, deep AWS experience, and we measure ourselves on operational impact rather than demos.",
        chips: ["security", "contact"],
        words: ["why", "trust", "different", "compare", "competitor", "experience", "credential", "reliable", "team"] },

      { id: "security", target: "#why-us", label: "Security & reliability",
        reply: "Security, monitoring and maintainability are designed in from day one, not bolted on. Your data stays inside your own AWS account.",
        chips: ["why", "contact"],
        words: ["secur", "privacy", "private", "compliance", "data", "safe", "monitor", "reliab", "uptime", "risk"] },

      { id: "pricing", target: "#contact", label: "What it costs",
        reply: "Pilots are fixed scope and fixed price so there's no open meter, and ongoing work runs as a monthly retainer. The number depends on scope \u2014 a 20-minute call gets you a real figure.",
        chips: ["lead", "process"],
        words: ["cost", "price", "pricing", "budget", "quote", "how much", "rate", "fee", "expensive", "afford"] },

      { id: "contact", target: "#contact", label: "Talk to a human",
        reply: "Happy to hand you over. I can take your details here and write the intro email for you, or you can email the team directly.",
        chips: ["lead", "email"],
        words: ["contact", "talk", "call", "human", "book", "meeting", "schedule", "demo", "reach", "speak", "hire"] }
    ],

    /* Chips shown on the intro gate, by knowledge id. */
    gateChips: ["services", "process", "why", "pricing"],

    /* Nudges: quiet, contextual, at most twice per visit. */
    nudges: {
      services:      "Want me to break down which of the three fits you?",
      "how-we-work": "Curious what happens in the first two weeks?",
      "why-us":      "Questions about security or how we run in production?",
      contact:       "Want me to write the intro email for you?"
    }
  };

  /* ---------------------------------------------------------------- setup */

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var mqCompact = window.matchMedia ? window.matchMedia("(max-width: 820px)") : { matches: false };
  var byId = {};
  CONFIG.knowledge.forEach(function (k) { byId[k.id] = k; });

  var CSS = [
    '#aps-root{--panel:#0B0F14;--panel2:#0F151B;--line:rgba(0,240,255,.16);--cyan:#00F0FF;--green:#00FF9D;',
    '  --cream:#E9F6FF;--muted:#8593A0;position:fixed;inset:0;z-index:2147483000;pointer-events:none;',
    "  font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif}",
    '#aps-root *{box-sizing:border-box}',
    '#aps-root button{font:inherit}',
    '#aps-root :focus-visible{outline:2px solid var(--cyan);outline-offset:3px;border-radius:8px}',

    /* ape */
    '.aps-ape{position:relative;width:120px;pointer-events:auto;filter:drop-shadow(0 3px 18px rgba(0,240,255,.4));transition:filter .3s,transform .2s}',
    '.aps-ape.click{cursor:pointer;background:none;border:0;padding:0;display:block}',
    '.aps-ape.click:hover{filter:drop-shadow(0 3px 28px rgba(0,255,157,.6));transform:scale(1.05)}',
    '.aps-bob{animation:aps-float 4.6s ease-in-out infinite}',
    '.aps-move{position:relative;transform-origin:50% 92%;transition:transform .6s cubic-bezier(.2,.8,.3,1)}',
    '.aps-move img{width:100%;height:auto;display:block;pointer-events:none;-webkit-user-drag:none}',
    '.aps-move .aps-blink{position:absolute;top:0;left:0;width:100%;opacity:0;transition:opacity .07s linear}',
    '.aps-ape.blink .aps-blink{opacity:1}',
    '@keyframes aps-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}',

    /* intro gate */
    '.aps-gate{position:absolute;inset:0;z-index:5;pointer-events:auto;overflow-y:auto;',
    '  background:radial-gradient(900px 620px at 50% 30%,#0d1a22 0%,#05070a 72%);opacity:1;transition:opacity .55s ease}',
    '.aps-gate.hide{opacity:0;pointer-events:none}',
    '.aps-gate-inner{min-height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;',
    '  text-align:center;max-width:600px;margin:0 auto;padding:40px 20px;animation:aps-rise .6s ease}',
    '@keyframes aps-rise{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}',
    '.aps-gate-ape{width:min(200px,28vh);max-width:56vw;margin:0 auto 2px;flex:0 0 auto}',
    '.aps-gate-ape .aps-ape{width:100%}',
    ".aps-gate h2{font-family:'Space Grotesk','Inter',sans-serif;font-size:clamp(26px,5vw,38px);letter-spacing:-.03em;",
    '  margin:12px 0 8px;color:var(--cream);font-weight:700}',
    '.aps-gate .sub{color:var(--muted);font-size:15.5px;margin:0 auto 24px;max-width:420px;min-height:44px;line-height:1.55}',
    '.aps-gchips{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-bottom:20px}',
    '.aps-gchip{border:1px solid var(--line);background:rgba(255,255,255,.03);color:var(--cream);font-size:14px;',
    '  padding:11px 17px;border-radius:14px;cursor:pointer;font-weight:500;transition:.2s}',
    '.aps-gchip:hover{border-color:var(--green);color:var(--green);transform:translateY(-2px);box-shadow:0 8px 24px -14px rgba(0,255,157,.7)}',
    '.aps-gform{display:flex;gap:8px;width:100%;max-width:430px;margin:0 auto 18px}',
    '.aps-gform input{flex:1;min-width:0;background:rgba(0,0,0,.35);border:1px solid var(--line);color:var(--cream);',
    '  border-radius:14px;padding:13px 15px;font-size:15px;outline:none}',
    '.aps-gform input:focus{border-color:var(--cyan)}',
    '.aps-gform button{background:linear-gradient(135deg,var(--cyan),var(--green));border:0;color:#04120a;font-weight:800;',
    '  border-radius:14px;padding:0 20px;cursor:pointer;font-size:17px}',
    '.aps-skip{background:none;border:0;color:var(--muted);font-size:13px;cursor:pointer;padding:8px}',
    '.aps-skip:hover{color:var(--cream)}',

    /* section rail — the signature: page structure as a signal line */
    '.aps-rail{position:absolute;right:16px;top:50%;transform:translateY(-50%);height:min(44vh,340px);width:2px;',
    '  background:rgba(255,255,255,.09);pointer-events:auto;opacity:0;transition:opacity .5s;border-radius:2px}',
    '.aps-rail.show{opacity:1}',
    '.aps-rail.dim{opacity:.25}',
    '.aps-rail-fill{position:absolute;top:0;left:0;width:2px;height:0;border-radius:2px;',
    '  background:linear-gradient(180deg,var(--cyan),var(--green));transition:height .25s linear;box-shadow:0 0 12px rgba(0,240,255,.5)}',
    '.aps-node{position:absolute;left:50%;width:9px;height:9px;margin-left:-4.5px;margin-top:-4.5px;border-radius:50%;',
    '  background:#0A0A0F;border:1.5px solid rgba(255,255,255,.3);cursor:pointer;transition:.25s;padding:0}',
    '.aps-node:hover{border-color:var(--cyan);transform:scale(1.35)}',
    '.aps-node.on{border-color:var(--green);background:var(--green);box-shadow:0 0 0 4px rgba(0,255,157,.14)}',
    '.aps-node-label{position:absolute;right:22px;top:50%;transform:translateY(-50%) translateX(6px);white-space:nowrap;',
    '  background:rgba(10,12,18,.94);border:1px solid var(--line);color:var(--cream);font-size:11.5px;letter-spacing:.06em;',
    '  text-transform:uppercase;font-weight:600;padding:5px 10px;border-radius:8px;opacity:0;pointer-events:none;transition:.22s}',
    '.aps-node:hover .aps-node-label,.aps-node:focus-visible .aps-node-label{opacity:1;transform:translateY(-50%) translateX(0)}',
    '.aps-spark{position:absolute;left:50%;width:7px;height:7px;margin-left:-3.5px;border-radius:50%;background:var(--cyan);',
    '  box-shadow:0 0 14px 3px rgba(0,240,255,.8);opacity:0;pointer-events:none}',
    '.aps-spark.go{animation:aps-spark .75s cubic-bezier(.4,0,.2,1) forwards}',
    '@keyframes aps-spark{0%{opacity:1;transform:scale(.6)}70%{opacity:1}100%{opacity:0;transform:scale(1.6)}}',

    /* corner buddy */
    '.aps-buddy{position:absolute;right:20px;bottom:16px;display:flex;flex-direction:column;align-items:flex-end;',
    '  pointer-events:none;opacity:0;visibility:hidden;transition:opacity .4s,transform .4s;transform:translateY(10px)}',
    '.aps-buddy.show{opacity:1;visibility:visible;transform:none}',
    '.aps-bubble{pointer-events:auto;position:relative;max-width:220px;margin:0 8px 10px 0;background:var(--panel2);',
    '  border:1px solid var(--line);border-radius:14px;padding:11px 32px 11px 13px;font-size:13.5px;line-height:1.45;',
    '  color:var(--cream);box-shadow:0 18px 50px -20px rgba(0,0,0,.9);cursor:pointer;opacity:0;transform:translateY(6px);',
    '  transition:.35s;visibility:hidden}',
    '.aps-bubble.show{opacity:1;transform:none;visibility:visible}',
    '.aps-bubble b{color:var(--green);font-weight:600}',
    '.aps-bubble-x{position:absolute;top:4px;right:5px;background:none;border:0;color:var(--muted);cursor:pointer;',
    '  font-size:15px;line-height:1;padding:4px}',
    '.aps-bubble-x:hover{color:var(--cream)}',

    /* chat panel */
    '.aps-scrim{position:absolute;inset:0;background:rgba(4,6,9,.5);backdrop-filter:blur(2px);opacity:0;transition:opacity .45s;pointer-events:none}',
    '.aps-scrim.show{opacity:1;pointer-events:auto}',
    '.aps-panel{position:absolute;right:24px;bottom:24px;width:380px;max-width:calc(100vw - 32px);display:flex;flex-direction:column;',
    '  background:linear-gradient(180deg,var(--panel2),var(--panel));border:1px solid var(--line);border-radius:20px;',
    '  box-shadow:0 30px 90px -24px rgba(0,0,0,.9),0 0 34px -12px rgba(0,240,255,.35);color:var(--cream);',
    '  transform:translateY(22px) scale(.97);opacity:0;pointer-events:none;transition:transform .42s cubic-bezier(.2,.8,.3,1),opacity .3s;overflow:hidden}',
    '.aps-panel.open{transform:none;opacity:1;pointer-events:auto}',
    '.aps-head{display:flex;align-items:center;gap:12px;padding:15px 16px 12px;border-bottom:1px solid var(--line);flex:0 0 auto}',
    '.aps-mini{width:44px;height:44px;flex:0 0 44px;border-radius:50%;object-fit:cover;object-position:center 38%;',
    '  border:1px solid var(--line);background:#0a0e12}',
    ".aps-title{font-family:'Space Grotesk','Inter',sans-serif;font-weight:600;font-size:15.5px;letter-spacing:-.01em}",
    '.aps-sub{font-size:11.5px;color:var(--muted);display:flex;align-items:center;gap:6px;margin-top:2px;letter-spacing:.04em}',
    '.aps-sub .pulse{width:7px;height:7px;flex:0 0 7px;border-radius:50%;background:var(--green);animation:aps-p 2.4s infinite}',
    '@keyframes aps-p{0%{box-shadow:0 0 0 0 rgba(0,255,157,.5)}70%{box-shadow:0 0 0 8px rgba(0,255,157,0)}100%{box-shadow:0 0 0 0 rgba(0,255,157,0)}}',
    '.aps-x{margin-left:auto;background:none;border:0;color:var(--muted);cursor:pointer;font-size:20px;padding:6px;border-radius:8px;line-height:1}',
    '.aps-x:hover{color:var(--cream);background:rgba(255,255,255,.06)}',
    '.aps-body{padding:16px;overflow-y:auto;flex:1 1 auto;max-height:min(52vh,380px);scrollbar-width:thin}',
    '.aps-body::-webkit-scrollbar{width:6px}.aps-body::-webkit-scrollbar-thumb{background:rgba(255,255,255,.12);border-radius:3px}',
    '.aps-msg{font-size:14px;line-height:1.6;margin:0 0 12px;background:rgba(255,255,255,.045);border:1px solid var(--line);',
    '  padding:11px 14px;border-radius:14px;border-top-left-radius:5px;max-width:90%;white-space:pre-wrap;overflow-wrap:anywhere}',
    '.aps-msg.me{margin-left:auto;background:linear-gradient(135deg,rgba(0,240,255,.14),rgba(0,255,157,.14));',
    '  border-color:rgba(0,255,157,.35);border-radius:14px;border-top-right-radius:5px}',
    '.aps-dots{display:inline-flex;gap:4px;align-items:center;height:10px}',
    '.aps-dots i{width:5px;height:5px;border-radius:50%;background:var(--muted);display:block;animation:aps-d 1.1s infinite}',
    '.aps-dots i:nth-child(2){animation-delay:.16s}.aps-dots i:nth-child(3){animation-delay:.32s}',
    '@keyframes aps-d{0%,60%,100%{opacity:.28;transform:translateY(0)}30%{opacity:1;transform:translateY(-3px)}}',
    '.aps-chips{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 12px}',
    '.aps-chip{border:1px solid var(--line);background:rgba(255,255,255,.03);color:var(--cream);font-size:13px;',
    '  padding:8px 13px;border-radius:999px;cursor:pointer;font-weight:500;transition:.18s}',
    '.aps-chip:hover{border-color:var(--green);color:var(--green);transform:translateY(-1px)}',
    '.aps-chip.go{border-color:rgba(0,255,157,.5);background:linear-gradient(135deg,rgba(0,240,255,.14),rgba(0,255,157,.14))}',
    '.aps-foot{display:flex;gap:8px;padding:12px 14px;border-top:1px solid var(--line);flex:0 0 auto}',
    '.aps-input{flex:1;min-width:0;background:rgba(0,0,0,.35);border:1px solid var(--line);color:var(--cream);',
    '  border-radius:12px;padding:11px 13px;font-size:14px;outline:none}',
    '.aps-input:focus{border-color:var(--cyan)}',
    '.aps-send{background:linear-gradient(135deg,var(--cyan),var(--green));border:0;color:#04120a;font-weight:800;',
    '  border-radius:12px;padding:0 16px;cursor:pointer;font-size:16px}',
    '.aps-send:active{transform:scale(.97)}',
    '.aps-fadein{animation:aps-fi .35s ease}',
    '@keyframes aps-fi{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}',

    '@media (max-width:820px){.aps-rail{display:none}.aps-buddy .aps-ape{width:88px}.aps-buddy{right:12px;bottom:12px}',
    '  .aps-panel{right:12px;left:12px;bottom:12px;width:auto}.aps-body{max-height:46vh}}',
    '@media (prefers-reduced-motion:reduce){#aps-root *{animation:none!important;transition:opacity .2s!important}}'
  ].join("\n");

  var style = document.createElement("style");
  style.textContent = CSS;
  document.head.appendChild(style);

  var M = CONFIG.assets.mascot, MB = CONFIG.assets.blink;
  var apeInner =
    '<div class="aps-bob"><div class="aps-move">' +
    '<img class="aps-open" src="' + M + '" alt="' + CONFIG.name + ' the ape assistant"/>' +
    '<img class="aps-blink" src="' + MB + '" alt=""/></div></div>';

  var root = document.createElement("div");
  root.id = "aps-root";

  var gateChipHtml = CONFIG.gateChips.map(function (id, i) {
    return '<button class="aps-gchip" data-g="' + i + '">' + (byId[id] ? byId[id].label : id) + "</button>";
  }).join("");

  root.innerHTML =
    '<div class="aps-scrim" data-close></div>' +
    '<div class="aps-rail" aria-hidden="true"><div class="aps-rail-fill"></div><div class="aps-spark"></div></div>' +
    '<div class="aps-panel" role="dialog" aria-label="' + CONFIG.name + ' assistant">' +
      '<div class="aps-head">' +
        '<img class="aps-mini" src="' + M + '" alt=""/>' +
        '<div><div class="aps-title">' + CONFIG.name + '</div>' +
        '<div class="aps-sub"><span class="pulse"></span><span class="aps-status">Smart AiPS guide</span></div></div>' +
        '<button class="aps-x" data-close aria-label="Close chat">\u00D7</button>' +
      '</div>' +
      '<div class="aps-body" role="log" aria-live="polite"></div>' +
      '<div class="aps-foot">' +
        '<input class="aps-input" type="text" placeholder="Ask me anything\u2026" aria-label="Message ' + CONFIG.name + '"/>' +
        '<button class="aps-send" aria-label="Send message">\u2192</button>' +
      '</div>' +
    '</div>' +
    '<div class="aps-gate" role="dialog" aria-label="' + CONFIG.name + ' welcome">' +
      '<div class="aps-gate-inner">' +
        '<div class="aps-gate-ape"><div class="aps-ape">' + apeInner + '</div></div>' +
        '<h2>' + CONFIG.gateHeadline + '</h2>' +
        '<p class="sub">' + CONFIG.gateSub + '</p>' +
        '<div class="aps-gchips">' + gateChipHtml + '</div>' +
        '<div class="aps-gform"><input type="text" placeholder="e.g. our quoting process is manual" aria-label="Ask ' + CONFIG.name + '"/>' +
        '<button aria-label="Send">\u2192</button></div>' +
        '<button class="aps-skip">Skip \u2014 take me to the site \u2192</button>' +
      '</div>' +
    '</div>' +
    '<div class="aps-buddy">' +
      '<div class="aps-bubble" role="status"><button class="aps-bubble-x" aria-label="Dismiss">\u00D7</button><span class="aps-bubble-t"></span></div>' +
      '<button class="aps-ape click" aria-label="Open ' + CONFIG.name + ' chat">' + apeInner + "</button>" +
    "</div>";

  document.body.appendChild(root);

  var $ = function (s) { return root.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(root.querySelectorAll(s)); };

  var scrim = $(".aps-scrim"), panel = $(".aps-panel"), body = $(".aps-body"),
      input = $(".aps-input"), send = $(".aps-send"), status = $(".aps-status"),
      gate = $(".aps-gate"), gateSub = $(".aps-gate .sub"), ginput = $(".aps-gform input"),
      gsend = $(".aps-gform button"), skip = $(".aps-skip"),
      buddy = $(".aps-buddy"), buddyApe = $(".aps-buddy .aps-ape"),
      bubble = $(".aps-bubble"), bubbleText = $(".aps-bubble-t"),
      rail = $(".aps-rail"), railFill = $(".aps-rail-fill"), spark = $(".aps-spark");

  var apes = $$(".aps-ape"), moves = $$(".aps-move");

  var state = {
    panelOpen: false, seeded: false, gateOpen: false,
    section: "", lead: null, nudges: 0, interacted: false, booted: false,
    history: []
  };

  /* ------------------------------------------------------------- ape life */

  function blinkOnce() {
    apes.forEach(function (a) {
      a.classList.add("blink");
      setTimeout(function () { a.classList.remove("blink"); }, 110);
    });
  }
  function scheduleBlink() {
    setTimeout(function () {
      if (!document.hidden) { blinkOnce(); if (Math.random() < 0.28) setTimeout(blinkOnce, 190); }
      scheduleBlink();
    }, 2400 + Math.random() * 4200);
  }
  var MOVES = ["rotate(-5deg)", "rotate(5deg)", "translateY(5px)", "translateX(-5px) rotate(-3deg)",
               "translateX(5px) rotate(3deg)", "scale(1.04)"];
  function doMove() {
    if (state.panelOpen) return;
    var m = MOVES[(Math.random() * MOVES.length) | 0];
    moves.forEach(function (el) {
      el.style.transform = m;
      setTimeout(function () { el.style.transform = ""; }, 900 + Math.random() * 400);
    });
  }
  function scheduleMove() { setTimeout(function () { doMove(); scheduleMove(); }, 7000 + Math.random() * 9000); }
  function apeTalk() {
    moves.forEach(function (el) {
      el.style.transform = "translateY(-8px) scale(1.04)";
      setTimeout(function () { el.style.transform = ""; }, 320);
    });
    if (Math.random() < 0.6) setTimeout(blinkOnce, 120);
  }
  if (!reduce) { scheduleBlink(); scheduleMove(); }

  /* ---------------------------------------------- section rail + awareness */

  var sections = [];
  function buildRail() {
    var els = Array.prototype.slice.call(document.querySelectorAll("[data-aipsy-section]"));
    if (!els.length) return;
    sections = els.map(function (el) {
      return { el: el, id: el.id, label: el.getAttribute("data-aipsy-section") };
    });
    var n = sections.length;
    sections.forEach(function (s, i) {
      var pct = n === 1 ? 50 : (i / (n - 1)) * 100;
      var b = document.createElement("button");
      b.className = "aps-node";
      b.style.top = pct + "%";
      b.setAttribute("aria-label", "Go to " + s.label);
      b.innerHTML = '<span class="aps-node-label">' + s.label + "</span>";
      b.addEventListener("click", function () { navigate("#" + s.id, true); });
      rail.appendChild(b);
      s.node = b;
      s.pct = pct;
    });
    rail.setAttribute("aria-hidden", "false");
    if (!state.gateOpen) rail.classList.add("show");

    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) setSection(e.target.id); });
      }, { rootMargin: "-45% 0px -45% 0px" });
      sections.forEach(function (s) { io.observe(s.el); });
    }
    onScroll();
  }

  function setSection(id) {
    if (state.section === id) return;
    state.section = id;
    sections.forEach(function (s) { s.node.classList.toggle("on", s.id === id); });
    var s = sections.filter(function (x) { return x.id === id; })[0];
    status.textContent = s ? "Reading \u00B7 " + s.label : "Smart AiPS guide";
  }

  function onScroll() {
    var h = document.documentElement.scrollHeight - window.innerHeight;
    var p = h > 0 ? Math.min(1, Math.max(0, window.scrollY / h)) : 0;
    railFill.style.height = (p * 100) + "%";
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);

  function sparkTo(id) {
    var s = sections.filter(function (x) { return x.id === id; })[0];
    if (!s || reduce) return;
    spark.style.top = s.pct + "%";
    spark.classList.remove("go");
    void spark.offsetWidth;
    spark.classList.add("go");
  }

  /* Scroll to a target, pulse the rail, and flash the destination. */
  function navigate(target, fromRail) {
    if (!target) return;
    var el = document.querySelector(target);
    if (!el) { location.hash = target; return; }
    var id = target.replace("#", "");
    sparkTo(id);
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    el.classList.add("aipsy-target");
    setTimeout(function () { el.classList.remove("aipsy-target"); }, 1800);
    if (!fromRail && state.panelOpen && mqCompact.matches) closePanel();
  }

  function lockScroll(on) {
    try {
      document.documentElement.style.overflow = on ? "hidden" : "";
      document.body.style.overflow = on ? "hidden" : "";
    } catch (e) {}
  }

  /* -------------------------------------------------------------- routing */

  function routeLocally(text) {
    var t = " " + text.toLowerCase() + " ";
    var best = null, bestScore = 0;
    CONFIG.knowledge.forEach(function (k) {
      var score = 0;
      k.words.forEach(function (w) { if (t.indexOf(w) > -1) score += w.length; });
      if (score > bestScore) { bestScore = score; best = k; }
    });
    return best;
  }

  var SMALL_TALK = [
    { words: ["hello", "hi ", "hey", "yo ", "ook", "howdy"], reply: "Hey \uD83D\uDC4B What are you trying to fix?" },
    { words: ["thank", "thanks", "cheers", "ta "], reply: "Any time. Anything else you want to dig into?" },
    { words: ["who are you", "what are you", "are you a bot", "are you real", "your name"],
      reply: "I'm Aipsy, the guide for this site \u2014 a small scripted assistant, not a person. For anything real, I'll put you in front of the team." },
    { words: ["bye", "later", "cheers bye"], reply: "Good luck out there. I'll be in the corner if you need me." }
  ];
  function smallTalk(text) {
    var t = " " + text.toLowerCase() + " ";
    for (var i = 0; i < SMALL_TALK.length; i++) {
      if (SMALL_TALK[i].words.some(function (w) { return t.indexOf(w) > -1; })) return SMALL_TALK[i].reply;
    }
    return null;
  }

  /* ----------------------------------------------------------- chat panel */

  function openPanel(prefill) {
    state.interacted = true;
    hideBubble();
    state.panelOpen = true;
    moves.forEach(function (el) { el.style.transform = ""; });
    if (!state.seeded) {
      addMsg(CONFIG.greeting, false);
      addChips(contextChips());
      state.seeded = true;
    }
    buddy.classList.remove("show");
    panel.classList.add("open");
    if (mqCompact.matches) scrim.classList.add("show");
    rail.classList.add("dim");
    setTimeout(function () {
      if (prefill) { handleTyped(prefill); } else { input.focus(); }
    }, 320);
  }

  function closePanel() {
    state.panelOpen = false;
    panel.classList.remove("open");
    scrim.classList.remove("show");
    rail.classList.remove("dim");
    if (!state.gateOpen) buddy.classList.add("show");
  }

  /* Suggestions follow the section you're reading. */
  function contextChips() {
    var map = {
      services: ["agents", "aws", "rag"],
      "how-we-work": ["timeline", "pricing", "contact"],
      "why-us": ["security", "process", "contact"],
      contact: ["lead", "pricing", "process"]
    };
    var ids = map[state.section] || ["services", "process", "pricing", "contact"];
    return ids;
  }

  function addMsg(text, me) {
    var d = document.createElement("div");
    d.className = "aps-msg aps-fadein" + (me ? " me" : "");
    d.textContent = text;
    body.appendChild(d);
    body.scrollTop = body.scrollHeight;
    return d;
  }

  function addThinking() {
    var d = document.createElement("div");
    d.className = "aps-msg aps-fadein";
    d.innerHTML = '<span class="aps-dots"><i></i><i></i><i></i></span>';
    body.appendChild(d);
    body.scrollTop = body.scrollHeight;
    return d;
  }

  /* items: array of knowledge ids, or {label, ask} objects. */
  function addChips(items) {
    if (!items || !items.length) return;
    var w = document.createElement("div");
    w.className = "aps-chips aps-fadein";
    items.forEach(function (it) {
      var label, action;
      if (typeof it === "string") {
        if (it === "lead") { label = "Leave my details"; action = startLead; }
        else if (it === "email") {
          label = "Email the team";
          action = function () { window.location.href = "mailto:" + CONFIG.contactEmail; };
        } else {
          var k = byId[it];
          if (!k) return;
          label = k.label;
          action = function () { choose(k); };
        }
      } else {
        label = it.label;
        action = function () { handleTyped(it.ask || it.label); };
      }
      var b = document.createElement("button");
      b.className = "aps-chip";
      b.textContent = label;
      b.addEventListener("click", action);
      w.appendChild(b);
    });
    body.appendChild(w);
    body.scrollTop = body.scrollHeight;
  }

  function choose(k) {
    addMsg(k.label, true);
    var t = addThinking();
    setTimeout(function () {
      t.remove();
      addMsg(k.reply, false);
      apeTalk();
      if (k.target) navigate(k.target);
      addChips(k.chips);
    }, 420);
  }

  /* ------------------------------------------------------- lead capture */

  var LEAD_STEPS = [
    { key: "name",    ask: "Nice. First \u2014 what's your name?" },
    { key: "email",   ask: "And the best email to reach you on?" },
    { key: "company", ask: "Company or team name?" },
    { key: "need",    ask: "Last one: in a sentence, what's the process you'd most like to stop doing by hand?" }
  ];

  function startLead() {
    state.lead = { step: 0, data: {} };
    addMsg("Leave my details", true);
    setTimeout(function () {
      addMsg("I'll take four quick things and write the intro email for you \u2014 you'll get to read it before anything sends.", false);
      addMsg(LEAD_STEPS[0].ask, false);
      apeTalk();
      input.focus();
    }, 350);
  }

  function leadStep(text) {
    var s = LEAD_STEPS[state.lead.step];
    if (s.key === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
      addMsg("That email doesn't look complete \u2014 mind checking it?", false);
      return;
    }
    state.lead.data[s.key] = text;
    state.lead.step++;
    if (state.lead.step < LEAD_STEPS.length) {
      setTimeout(function () { addMsg(LEAD_STEPS[state.lead.step].ask, false); }, 320);
      return;
    }
    var d = state.lead.data;
    state.lead = null;

    if (CONFIG.apiEndpoint) {
      fetch(CONFIG.apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "lead", lead: d })
      }).catch(function () {});
    }

    var subject = "Intro from " + d.name + (d.company ? " at " + d.company : "");
    var mail = "Hi Smart AiPS team,\n\n" + d.need + "\n\nName: " + d.name +
               "\nCompany: " + d.company + "\nEmail: " + d.email + "\n\nSent via Aipsy on your site.";
    var href = "mailto:" + CONFIG.contactEmail +
               "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(mail);

    setTimeout(function () {
      addMsg("Got it, " + d.name + ". Here's what I've written:\n\n\u201C" + d.need +
             "\u201D\n\nHit send and it opens in your mail app, already addressed. Someone replies within one business day.", false);
      apeTalk();
      var w = document.createElement("div");
      w.className = "aps-chips aps-fadein";
      var b = document.createElement("button");
      b.className = "aps-chip go";
      b.textContent = "Open the email \u2192";
      b.addEventListener("click", function () { window.location.href = href; });
      w.appendChild(b);
      var b2 = document.createElement("button");
      b2.className = "aps-chip";
      b2.textContent = "Actually, tell me more first";
      b2.addEventListener("click", function () { choose(byId.process); });
      w.appendChild(b2);
      body.appendChild(w);
      body.scrollTop = body.scrollHeight;
    }, 400);
  }

  /* ------------------------------------------------------ message handler */

  function handleTyped(text) {
    state.interacted = true;
    addMsg(text, true);
    input.value = "";
    state.history.push({ role: "user", content: text });

    if (state.lead) { leadStep(text); return; }

    if (CONFIG.apiEndpoint) {if (CONFIG.apiEndpoint) {
var t = addThinking();
var replyEl = null;
var fullReply = "";
var finalData = { target: null, chips: null };
fetch(CONFIG.apiEndpoint, {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({
message: text,
history: state.history.slice(-10),
section: state.section
})
})
.then(function (r) {
if (!r.ok) throw new Error("HTTP " + r.status);
// If the backend is not streaming, fall back to normal JSON
var ct = r.headers.get("content-type") || "";
if (ct.indexOf("text/event-stream") === -1) {
return r.json().then(function (data) {
t.remove();
addMsg(data.reply || "Here's where to look", false);
state.history.push({ role: "assistant", content: data.reply || "" });
apeTalk();
if (data.target) navigate(data.target);
addChips(data.chips && data.chips.length ? data.chips : contextChips());
});
}
// Streaming path (SSE)
t.remove();
replyEl = addMsg("", false); // empty bubble that we fill live
var reader = r.body.getReader();
var decoder = new TextDecoder();
var buffer = "";

function pump() {
return reader.read().then(function (result) {
if (result.done) {
// stream finished
state.history.push({ role: "assistant", content: fullReply });
apeTalk();
if (finalData.target) navigate(finalData.target);
addChips(finalData.chips && finalData.chips.length ? finalData.chips : contextChips());
return;
}
buffer += decoder.decode(result.value, { stream: true });
var parts = buffer.split("\n\n");
buffer = parts.pop(); // keep incomplete chunk
parts.forEach(function (part) {
var line = part.trim();
if (!line.startsWith("data:")) return;
var payload = line.slice(5).trim();
if (payload === "[DONE]") return;
try {
var obj = JSON.parse(payload);
if (obj.token) {
fullReply += obj.token;
replyEl.textContent = fullReply;
body.scrollTop = body.scrollHeight;
}
if (obj.reply) { // final full reply (optional)
fullReply = obj.reply;
replyEl.textContent = fullReply;
}
if (obj.target !== undefined) finalData.target = obj.target;
if (obj.chips) finalData.chips = obj.chips;
} catch (e) {
// plain text token fallback
fullReply += payload;
replyEl.textContent = fullReply;
body.scrollTop = body.scrollHeight;
}
});
return pump();
});
}
return pump();
})
.catch(function () {
if (t && t.parentNode) t.remove();
if (replyEl && replyEl.parentNode) replyEl.remove();
answerLocally(text); // silent local fallback
});
return;
}
      var t = addThinking();
      var replyEl = null;
      var fullReply = "";
      var finalData = { target: null, chips: null };

      fetch(CONFIG.apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: state.history.slice(-10),
          section: state.section
        })
      })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        // Non-streaming JSON response
        var ct = r.headers.get("content-type") || "";
        if (ct.indexOf("text/event-stream") === -1) {
          return r.json().then(function (data) {
            t.remove();
            addMsg(data.reply || "Here's where to look \uD83D\uDC47", false);
            state.history.push({ role: "assistant", content: data.reply || "" });
            apeTalk();
            if (data.target) navigate(data.target);
            addChips(data.chips && data.chips.length ? data.chips : contextChips());
          });
        }

        // Streaming path (SSE)
        t.remove();
        replyEl = addMsg("", false);
        var reader = r.body.getReader();
        var decoder = new TextDecoder();
        var buffer = "";

        function pump() {
          return reader.read().then(function (result) {
            if (result.done) {
              state.history.push({ role: "assistant", content: fullReply });
              apeTalk();
              if (finalData.target) navigate(finalData.target);
              addChips(finalData.chips && finalData.chips.length ? finalData.chips : contextChips());
              return;
            }
            buffer += decoder.decode(result.value, { stream: true });
            var parts = buffer.split("\n\n");
            buffer = parts.pop();

            parts.forEach(function (part) {
              var line = part.trim();
              if (!line.startsWith("data:")) return;
              var payload = line.slice(5).trim();
              if (payload === "[DONE]") return;

              try {
                var obj = JSON.parse(payload);
                if (obj.token) {
                  fullReply += obj.token;
                  replyEl.textContent = fullReply;
                  body.scrollTop = body.scrollHeight;
                }
                if (obj.reply) {
                  fullReply = obj.reply;
                  replyEl.textContent = fullReply;
                }
                if (obj.target !== undefined) finalData.target = obj.target;
                if (obj.chips) finalData.chips = obj.chips;
              } catch (e) {
                fullReply += payload;
                replyEl.textContent = fullReply;
                body.scrollTop = body.scrollHeight;
              }
            });
            return pump();
          });
        }
        return pump();
      })
      .catch(function () {
        if (t && t.parentNode) t.remove();
        if (replyEl && replyEl.parentNode) replyEl.remove();
        answerLocally(text);
      });
      return;
    }
    answerLocally(text);
  }

  function answerLocally(text) {
    var t = addThinking();
    setTimeout(function () {
      t.remove();
      var small = smallTalk(text);
      var k = routeLocally(text);
      if (small && !k) {
        addMsg(small, false);
        apeTalk();
        addChips(contextChips());
        return;
      }
      if (k) {
        addMsg(k.reply, false);
        state.history.push({ role: "assistant", content: k.reply });
        apeTalk();
        if (k.target) navigate(k.target);
        addChips(k.id === "contact" || k.id === "pricing" ? ["lead", "email"] : k.chips);
        return;
      }
      addMsg(CONFIG.fallback, false);
      addChips(["services", "process", "pricing", "contact"]);
    }, 480);
  }

  /* ------------------------------------------------------------ intro gate */

  function openGate() {
    state.gateOpen = true;
    gate.style.display = "flex";
    gate.classList.remove("hide");
    lockScroll(true);
    apeTalk();
    setTimeout(function () { if (!mqCompact.matches) ginput.focus(); }, 500);
  }

  function dismissGate(target) {
    if (!state.gateOpen) { if (target) navigate(target); return; }
    state.gateOpen = false;
    gate.classList.add("hide");
    lockScroll(false);
    buddy.classList.add("show");
    if (sections.length) rail.classList.add("show");
    setTimeout(function () {
      gate.style.display = "none";
      if (target) navigate(target);
    }, 560);
  }

  function gateInput(text) {
    state.interacted = true;
    if (CONFIG.apiEndpoint) {
      gateSub.textContent = "Thinking\u2026";
      apeTalk();
      fetch(CONFIG.apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, section: "gate" })
      })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          gateSub.textContent = d.reply || "Here we go \uD83D\uDC47";
          setTimeout(function () { dismissGate(d.target || ""); }, 900);
        })
        .catch(function () { gateFallback(text); });
      return;
    }
    gateFallback(text);
  }

  function gateFallback(text) {
    var k = routeLocally(text);
    if (k) {
      gateSub.textContent = k.reply;
      apeTalk();
      setTimeout(function () {
        dismissGate(k.target);
        /* carry the conversation into the panel so nothing is lost */
        state.seeded = true;
        addMsg(text, true);
        addMsg(k.reply, false);
        addChips(k.chips);
      }, 1100);
    } else {
      gateSub.textContent = CONFIG.fallback;
    }
  }

  /* ---------------------------------------------------------------- nudge */

  var nudgeTimer;
  function showBubble(text) {
    bubbleText.textContent = text;
    bubble.classList.add("show");
    apeTalk();
    state.nudges++;
    clearTimeout(nudgeTimer);
    nudgeTimer = setTimeout(hideBubble, 11000);
  }
  function hideBubble() { bubble.classList.remove("show"); clearTimeout(nudgeTimer); }

  bubble.addEventListener("click", function (e) {
    if (e.target.classList.contains("aps-bubble-x")) { hideBubble(); state.nudges = 9; return; }
    hideBubble();
    openPanel(bubbleText.textContent);
  });

  function watchIdle() {
    var last = Date.now();
    ["scroll", "click", "keydown", "touchstart"].forEach(function (ev) {
      window.addEventListener(ev, function () { last = Date.now(); }, { passive: true });
    });
    setInterval(function () {
      if (state.panelOpen || state.gateOpen || state.nudges >= 2 || document.hidden) return;
      if (Date.now() - last < 22000) return;
      var msg = CONFIG.nudges[state.section];
      if (!msg) return;
      last = Date.now();
      showBubble(msg);
    }, 4000);
  }

  /* --------------------------------------------------------------- wiring */

  $$(".aps-gchip").forEach(function (btn) {
    var k = byId[CONFIG.gateChips[+btn.dataset.g]];
    if (!k) return;
    btn.addEventListener("click", function () {
      gateSub.textContent = k.reply;
      apeTalk();
      setTimeout(function () {
        dismissGate(k.target);
        state.seeded = true;
        addMsg(k.label, true);
        addMsg(k.reply, false);
        addChips(k.chips);
      }, 950);
    });
  });

  gsend.addEventListener("click", function () { var v = ginput.value.trim(); if (v) gateInput(v); });
  ginput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") { var v = ginput.value.trim(); if (v) gateInput(v); }
  });
  skip.addEventListener("click", function () { dismissGate(""); });

  buddyApe.addEventListener("click", function () { openPanel(); });
  scrim.addEventListener("click", closePanel);
  $$("[data-close]").forEach(function (el) { el.addEventListener("click", closePanel); });
  send.addEventListener("click", function () { var v = input.value.trim(); if (v) handleTyped(v); });
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter") { var v = input.value.trim(); if (v) handleTyped(v); }
  });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (state.gateOpen) dismissGate("");
    else if (state.panelOpen) closePanel();
  });

  /* Any element on the page can start a conversation. */
  document.addEventListener("click", function (e) {
    var el = e.target.closest ? e.target.closest("[data-aipsy-ask]") : null;
    if (!el) return;
    e.preventDefault();
    var q = el.getAttribute("data-aipsy-ask");
    if (state.gateOpen) dismissGate("");
    if (state.panelOpen) handleTyped(q); else openPanel(q);
  });

  /* Public API, in case you want to trigger him from your own code. */
  window.Aipsy = {
    open: function (q) { openPanel(q); },
    close: closePanel,
    ask: function (q) { if (state.panelOpen) handleTyped(q); else openPanel(q); },
    go: navigate
  };

  /* ----------------------------------------------------------------- boot */

  function ssGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function ssSet(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }

  function boot() {
    if (state.booted) return;
    state.booted = true;
    buildRail();
    watchIdle();
    var seen = CONFIG.gateOncePerSession && ssGet("aps_gate");
    if (CONFIG.showIntroGate && !seen && !location.hash) {
      ssSet("aps_gate", "1");
      openGate();
    } else {
      gate.style.display = "none";
      buddy.classList.add("show");
      if (sections.length) rail.classList.add("show");
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
