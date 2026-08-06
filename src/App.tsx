import { useState, useEffect, useRef } from "react";
import { Flame, Play, Camera, Settings, Beer, Users, Heart, MessageCircle, Share2, Sparkles, Check, ChevronRight, ChevronLeft, RotateCcw, Volume2, Mic, ArrowRight, X, Star, Brain, Zap, Clock, Trophy } from "lucide-react";

// ─── DESIGN TOKENS ───────────────────────────────────────────────
// Base #FAFAF8 · Card #FFF · Dark #111
// K-red #EF3E4A · Violet #6246EA · Teal #2EC4B6 · Gold #FFBE0B · Moss #2D6A4F
// Signature: Pronunciation Bridge + Active Recall flip card

// ─── SPACED REPETITION ENGINE (SM-2 simplified) ──────────────────
function calcNextInterval(interval, ease, rating) {
  // rating: 1=forgot, 2=hard, 3=ok, 4=easy
  if (rating === 1) return { interval: 1, ease: Math.max(1.3, ease - 0.2) };
  if (rating === 2) return { interval: Math.max(1, Math.round(interval * 1.2)), ease: Math.max(1.3, ease - 0.1) };
  if (rating === 3) return { interval: Math.round(interval * ease), ease };
  return { interval: Math.round(interval * ease * 1.3), ease: Math.min(2.5, ease + 0.1) };
}

// ─── CONTENT ─────────────────────────────────────────────────────
const LEVELS = ["Total Newbie", "Getting There", "Drama Fan", "K-Fluent", "Almost Native"];

const ALL_WORDS = [
  {
    id: "daebak", word: "대박", roman: "dae-bak", soundsLike: "day-bahk",
    english: "OMG! / No way!", partOfSpeech: "exclamation",
    phrases: ["대박이야!", "완전 대박!", "대박, 진짜?"],
    phraseMeanings: ["This is insane!", "Absolutely insane!", "No way, seriously?"],
    bridgeNote: "Your brain hears 'day-bahk' — close! But the 'ae' is wider. '박' cuts off sharp like flicking a light switch off.",
    dramaKo: "대박, 진짜 너야?", dramaEn: '"No way, is that really you?"',
    show: { ko: "꽃보다 남자", en: "Boys Over Flowers" },
    useToday: "When a friend texts you something unbelievable → 대박",
    memoryHook: "'Day' you realize + 'Bahk' — reality hits. = MIND BLOWN"
  },
  {
    id: "hwaiting", word: "화이팅", roman: "hwa-i-ting", soundsLike: "figh-ting",
    english: "You got this! / Go!", partOfSpeech: "cheer",
    phrases: ["화이팅!", "우리 화이팅!", "오늘도 화이팅!"],
    phraseMeanings: ["Let's go!", "We got this!", "Fighting spirit today too!"],
    bridgeNote: "It IS 'fighting' — borrowed directly from English. Say it with your fist raised. That's the full experience.",
    dramaKo: "화이팅! 넌 할 수 있어!", dramaEn: '"Fighting! You can do it!"',
    show: { ko: "사랑의 불시착", en: "Crash Landing on You" },
    useToday: "Before a friend's exam, job interview, first date — text them 화이팅",
    memoryHook: "It's literally 'fighting' as a cheer. Raise your fist when you say it."
  },
  {
    id: "eomeo", word: "어머", roman: "eo-meo", soundsLike: "uh-muh",
    english: "Oh my! / Goodness!", partOfSpeech: "exclamation",
    phrases: ["어머, 어떡해!", "어머나!", "어머, 진짜?"],
    phraseMeanings: ["Oh my, what do I do!", "Oh my goodness!", "Oh my, really?"],
    bridgeNote: "Not 'mama' — barely move your mouth. Like you just saw something and forgot how to speak.",
    dramaKo: "어머, 이게 뭐야?", dramaEn: '"Oh my, what is this?"',
    show: { ko: "도깨비", en: "Guardian: The Lonely and Great God" },
    useToday: "When something surprises you — say it with wide eyes and slightly open mouth",
    memoryHook: "'Uh-muh' — the sound you make when you literally can't even"
  },
  {
    id: "wonsyat", word: "원샷", roman: "won-syat", soundsLike: "one-shot",
    english: "Down it! / Bottoms up!", partOfSpeech: "party command",
    phrases: ["자, 원샷!", "원샷 해!", "원샷이야!"],
    phraseMeanings: ["Alright, down it!", "Down it now!", "It's a bottoms up!"],
    bridgeNote: "Literally 'one shot' borrowed straight from English. Said LOUD = it's on. Tone carries everything.",
    dramaKo: "자, 원샷!", dramaEn: '"Alright, bottoms up!"',
    show: { ko: "이태원 클라쓰", en: "Itaewon Class" },
    useToday: "At a game loser moment — point and call 원샷!",
    memoryHook: "It's 'one shot'. You already know this."
  },
  {
    id: "ya", word: "야", roman: "ya", soundsLike: "yah",
    english: "Hey! (close friends only)", partOfSpeech: "casual call",
    phrases: ["야, 잠깐!", "야, 들어봐!", "야야야!"],
    phraseMeanings: ["Hey, hold on!", "Hey, listen!", "Hey hey hey!"],
    bridgeNote: "One syllable, snapped short. ONLY with close friends — with strangers it's rude. Snap it, don't drag it.",
    dramaKo: "야, 너 지금 어디야?", dramaEn: '"Hey, where are you right now?"',
    show: { ko: "응답하라 1988", en: "Reply 1988" },
    useToday: "Across a loud room — catch your close friend's attention with just: 야!",
    memoryHook: "Yah! Like a pirate's 'yes' — one shot, direct."
  },
  {
    id: "daebakida", word: "대박이다", roman: "dae-bak-i-da", soundsLike: "day-bahk-ee-dah",
    english: "This IS insane (full statement)", partOfSpeech: "statement",
    phrases: ["이거 대박이다!", "진짜 대박이다", "완전 대박이다!"],
    phraseMeanings: ["This is insane!", "This is genuinely incredible", "This is absolutely insane!"],
    bridgeNote: "대박 (OMG) + 이다 (it IS) = official confirmation, no debate. Longer = more emphatic.",
    dramaKo: "이 음식 대박이다!", dramaEn: '"This food is INSANE!"',
    show: { ko: "식샤를 합시다", en: "Let's Eat" },
    useToday: "When the food, the moment, the view hits different — declare it: 대박이다",
    memoryHook: "대박 (wow) + 이다 (it is) = confirmed wow, no take-backs"
  }
];

const WEEKDAY_IDS = ["daebak", "hwaiting", "eomeo"];
const WEEKEND_IDS = ["wonsyat", "ya", "daebakida"];

const QUIZ_ONBOARD = [
  { q: "When a K-drama character yells 대박 — you feel:", opts: [{ t: "Never heard it", v: 0 }, { t: "Heard it, fuzzy on meaning", v: 1 }, { t: "Know exactly when to use it", v: 2 }] },
  { q: "Watching K-drama without subtitles:", opts: [{ t: "Complete mystery", v: 0 }, { t: "I catch a few words", v: 1 }, { t: "I follow the general plot", v: 2 }] },
  { q: "Your Hangul reading:", opts: [{ t: "What's Hangul?", v: 0 }, { t: "I can sound it out slowly", v: 1 }, { t: "I read it even if I don't know words", v: 2 }] }
];

const GAMES_DATA = [
  { icon: "3️⃣6️⃣9️⃣", name: "삼육구 (Sam-yuk-gu)", rule: "Count up together. Multiples of 3/6/9 = CLAP. Miss it? 원샷!", tip: "Goes faster than you think. 1, 2, 👏, 4, 5, 👏..." },
  { icon: "🔤", name: "끝말잇기 (Word Relay)", rule: "Last syllable of one word = first of the next. In Korean. Loser buys next round.", tip: "Start: 사람 → 람쥐 → 쥐구멍... someone gets stuck fast" },
  { icon: "🤫", name: "진실 게임 (Truth Game)", rule: "진실 (truth) or 거짓말 (lie, everyone guesses). Wrong guess = 원샷.", tip: "Korean version skips the dare — all about reading each other" },
  { icon: "🎤", name: "노래 릴레이 (Song Relay)", rule: "Sing 2 K-pop lines. Next person must start with last word you sang.", tip: "BTS → BLACKPINK → aespa — impossible to stop" }
];

const COMMUNITY_DATA = [
  { emoji: "🛑", caption: "Found this at a crosswalk in Chicago — what would a Seoul street actually say?", by: "@chicago_kdrama", time: "2h", replies: [{ who: "민지 🇰🇷 Native", text: "Seoul crosswalk buttons say '길을 건너세요' (cross the road) when safe! Same vibe totally different phrase 😄", hearts: 312 }, { who: "서현 🇰🇷 Native", text: "Fun: we also show '남은 시간' (time remaining) on the countdown — we love timers lol", hearts: 89 }] },
  { emoji: "🧋", caption: "My boba cup says 'shake well' — what's the Seoul cafe version?", by: "@nyc_bobafan", time: "5h", replies: [{ who: "준호 🇰🇷 Native", text: "잘 흔들어 주세요 — you'll actually see this exact phrase in Korea! Same instruction, way more polite-sounding 😊", hearts: 441 }] },
  { emoji: "🏋️", caption: "Gym rules sign — curious what Korean gyms put on theirs", by: "@la_gymrat", time: "1d", replies: [] }
];

// ─── HELPERS ─────────────────────────────────────────────────────
function cn(...a) { return a.filter(Boolean).join(" "); }
function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }
function getWord(id) { return ALL_WORDS.find(w => w.id === id); }

function initSRCard(id) {
  return { id, interval: 1, ease: 2.0, reps: 0, nextDue: Date.now(), lastRating: null };
}

// ─── PRONUNCIATION BRIDGE ─────────────────────────────────────────
function PronunciationBridge({ soundsLike, roman, word }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <div className="rounded-2xl border-2 border-black/8 bg-white p-4 mb-3">
      <p className="text-[10px] font-bold text-black/25 tracking-wider mb-3">PRONUNCIATION BRIDGE</p>
      <div className="flex items-center gap-2">
        <div className="flex-1 text-center bg-[#6246EA]/6 rounded-xl p-2">
          <p className="text-[9px] text-[#6246EA]/70 mb-1 font-semibold">YOUR BRAIN HEARS</p>
          <p className="text-base font-black text-[#6246EA]">"{soundsLike}"</p>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-8 h-0.5 bg-gradient-to-r from-[#6246EA] to-[#EF3E4A]" />
          <p className="text-[8px] text-black/20 mt-0.5">→</p>
        </div>
        <button onClick={() => setRevealed(true)} className={cn("flex-1 text-center rounded-xl p-2 transition-all", revealed ? "bg-[#EF3E4A]/6" : "bg-black/4")}>
          <p className="text-[9px] text-[#EF3E4A]/70 mb-1 font-semibold">REAL KOREAN</p>
          <p className={cn("text-base font-black transition-all", revealed ? "text-[#EF3E4A]" : "text-black/15")}>{revealed ? word : "tap"}</p>
        </button>
        <button className="w-8 h-8 rounded-full bg-[#EF3E4A] flex items-center justify-center flex-shrink-0 shadow-sm">
          <Volume2 size={12} className="text-white" />
        </button>
      </div>
      {revealed && <p className="text-[11px] text-black/45 mt-3 pt-2 border-t border-black/6 leading-relaxed">{roman}</p>}
    </div>
  );
}

// ─── ACTIVE RECALL CARD ───────────────────────────────────────────
function RecallCard({ wordObj, onRated }) {
  const [flipped, setFlipped] = useState(false);
  const [rated, setRated] = useState(false);
  const ratings = [
    { v: 1, label: "Forgot", color: "bg-red-100 text-red-600 border-red-200" },
    { v: 2, label: "Hard", color: "bg-orange-100 text-orange-600 border-orange-200" },
    { v: 3, label: "Got it", color: "bg-[#2EC4B6]/10 text-[#2EC4B6] border-[#2EC4B6]/20" },
    { v: 4, label: "Easy", color: "bg-[#2D6A4F]/10 text-[#2D6A4F] border-[#2D6A4F]/20" },
  ];
  return (
    <div className="flex-1 flex flex-col px-5 pt-2">
      <div className="bg-[#6246EA]/8 rounded-2xl px-3 py-2 mb-4 flex items-center gap-2">
        <Brain size={13} className="text-[#6246EA]" />
        <p className="text-[11px] font-bold text-[#6246EA]">Active Recall — try to remember before flipping</p>
      </div>

      <button onClick={() => setFlipped(true)}
        className={cn("flex-1 rounded-3xl border-2 p-6 flex flex-col items-center justify-center transition-all mb-4", flipped ? "border-[#EF3E4A]/30 bg-white" : "border-black/8 bg-white active:scale-[0.98]")}>
        {!flipped ? (
          <>
            <p className="text-[10px] font-bold text-black/30 mb-4">WHAT DOES THIS MEAN?</p>
            <p className="text-6xl font-black text-[#111] mb-2" style={{ fontFamily: "Georgia, serif" }}>{wordObj.word}</p>
            <p className="text-sm text-black/40">{wordObj.roman}</p>
            <p className="text-[11px] text-[#6246EA] mt-6 font-semibold">Tap to reveal →</p>
          </>
        ) : (
          <>
            <p className="text-[10px] font-bold text-[#EF3E4A] mb-3">ANSWER</p>
            <p className="text-3xl font-black text-[#111] mb-3" style={{ fontFamily: "Georgia, serif" }}>{wordObj.word}</p>
            <p className="text-lg font-bold text-[#EF3E4A] mb-2">{wordObj.english}</p>
            <div className="flex flex-wrap gap-1.5 justify-center mt-2">
              {wordObj.phrases.map((p, i) => (
                <span key={i} className="bg-[#6246EA]/8 text-[#6246EA] text-[11px] font-semibold px-2 py-1 rounded-lg">{p}</span>
              ))}
            </div>
          </>
        )}
      </button>

      {flipped && !rated && (
        <div className="mb-4">
          <p className="text-[10px] font-bold text-black/30 text-center mb-2">HOW DID YOU DO?</p>
          <div className="grid grid-cols-4 gap-2">
            {ratings.map(r => (
              <button key={r.v} onClick={() => { setRated(true); setTimeout(() => onRated(r.v), 400); }}
                className={cn("py-2.5 rounded-xl border-2 text-[11px] font-black transition-all", r.color)}>
                {r.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {rated && (
        <div className="mb-4 text-center">
          <p className="text-sm font-bold text-[#2EC4B6]">✓ Saved to your review schedule</p>
        </div>
      )}
    </div>
  );
}

// ─── MICRO TEST ───────────────────────────────────────────────────
function MicroTestScreen({ learnedIds, onDone }) {
  const learned = learnedIds.map(getWord).filter(Boolean);
  const [qIdx, setQIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(null);
  const [done, setDone] = useState(false);

  // Build 3 interleaved questions from learned words
  const shuffled = shuffle(learned).slice(0, Math.min(3, learned.length));
  const questions = shuffled.map(target => {
    const distractors = shuffle(learned.filter(w => w.id !== target.id)).slice(0, 3);
    const opts = shuffle([target, ...distractors]);
    return { target, opts };
  });

  if (questions.length === 0) { onDone(0, 0); return null; }

  const q = questions[qIdx];
  if (!q) return null;

  function pick(word) {
    if (answered) return;
    setAnswered(word.id);
    if (word.id === q.target.id) setScore(s => s + 1);
    setTimeout(() => {
      if (qIdx + 1 < questions.length) { setQIdx(i => i + 1); setAnswered(null); }
      else setDone(true);
    }, 900);
  }

  if (done) return (
    <div className="flex-1 flex flex-col items-center justify-center px-5 text-center">
      <div className="w-20 h-20 rounded-full bg-[#FFBE0B] flex items-center justify-center mb-4">
        <Trophy size={32} className="text-white" />
      </div>
      <p className="text-[11px] font-bold text-black/30 mb-2">QUICK TEST DONE</p>
      <p className="text-3xl font-black text-[#111] mb-2">{score}/{questions.length}</p>
      <p className="text-sm text-black/50 mb-8">{score === questions.length ? "Perfect! Intervals extended 🚀" : score >= questions.length / 2 ? "Good — keep going" : "These words need more reps — we'll bring them back sooner"}</p>
      <button onClick={() => onDone(score, questions.length)} className="px-8 py-3.5 rounded-full bg-[#111] text-white font-black text-sm">Continue</button>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col px-5 pt-4">
      <div className="flex gap-1.5 mb-4">
        {questions.map((_, i) => <div key={i} className={cn("h-1 flex-1 rounded-full", i < qIdx ? "bg-[#FFBE0B]" : i === qIdx ? "bg-[#111]" : "bg-black/8")} />)}
      </div>
      <div className="bg-[#FFBE0B]/10 rounded-2xl px-3 py-2 mb-4 flex items-center gap-2">
        <Zap size={13} className="text-[#FFBE0B]" />
        <p className="text-[11px] font-bold text-black/50">Micro Test — {qIdx + 1} of {questions.length}</p>
      </div>
      <div className="flex-1 flex flex-col">
        <div className="bg-[#111] rounded-3xl p-6 flex flex-col items-center justify-center mb-6">
          <p className="text-5xl font-black text-white mb-2" style={{ fontFamily: "Georgia, serif" }}>{q.target.word}</p>
          <p className="text-white/40 text-sm">{q.target.roman}</p>
        </div>
        <p className="text-[10px] font-bold text-black/30 text-center mb-3">WHICH MEANING IS RIGHT?</p>
        <div className="grid grid-cols-2 gap-2">
          {q.opts.map(opt => {
            const isTarget = opt.id === q.target.id;
            const isAnswered = answered !== null;
            const isThis = answered === opt.id;
            let cls = "border-black/8 bg-white text-[#111]";
            if (isAnswered && isTarget) cls = "border-[#2EC4B6] bg-[#2EC4B6]/10 text-[#2EC4B6]";
            else if (isAnswered && isThis && !isTarget) cls = "border-red-300 bg-red-50 text-red-500";
            return (
              <button key={opt.id} onClick={() => pick(opt)}
                className={cn("py-3 px-2 rounded-2xl border-2 text-xs font-bold text-center transition-all", cls)}>
                {opt.english}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── REVIEW QUEUE SCREEN ──────────────────────────────────────────
function ReviewScreen({ dueCards, srCards, onRate, onDone }) {
  const [idx, setIdx] = useState(0);
  if (dueCards.length === 0) return (
    <div className="flex-1 flex flex-col items-center justify-center px-5 text-center">
      <Clock size={36} className="text-black/20 mb-3" />
      <p className="font-black text-[#111] text-lg mb-2">All caught up!</p>
      <p className="text-sm text-black/40 mb-8">No words due for review right now. Come back later.</p>
      <button onClick={onDone} className="px-8 py-3 rounded-full bg-[#111] text-white font-black text-sm">Back to home</button>
    </div>
  );
  const wordObj = getWord(dueCards[idx]);
  if (!wordObj) { onDone(); return null; }
  return (
    <div className="flex-1 flex flex-col">
      <div className="px-5 pt-5 pb-2 flex items-center justify-between">
        <span className="text-[10px] font-bold text-black/30 tracking-wider">REVIEW · {idx + 1}/{dueCards.length}</span>
        <button onClick={onDone} className="text-xs text-black/30 font-semibold">Skip</button>
      </div>
      <RecallCard wordObj={wordObj} onRated={(rating) => {
        onRate(wordObj.id, rating);
        if (idx + 1 < dueCards.length) setIdx(i => i + 1);
        else onDone();
      }} />
    </div>
  );
}

// ─── PHRASE CHUNK DRILL ───────────────────────────────────────────
function PhraseChunkDrill({ wordObj, onDone }) {
  const [pIdx, setPIdx] = useState(0);
  const [shown, setShown] = useState(false);
  if (pIdx >= wordObj.phrases.length) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-5 text-center">
        <p className="text-3xl mb-3">✅</p>
        <p className="font-black text-[#111] text-lg mb-2">All phrases drilled!</p>
        <p className="text-sm text-black/40 mb-8">Your brain just stored {wordObj.word} in 3 different real-life contexts.</p>
        <button onClick={onDone} className="px-8 py-3.5 rounded-full bg-[#EF3E4A] text-white font-black text-sm">Test myself now →</button>
      </div>
    );
  }
  return (
    <div className="flex-1 flex flex-col px-5 pt-2">
      <div className="bg-[#2D6A4F]/10 rounded-2xl px-3 py-2 mb-4 flex items-center gap-2">
        <Sparkles size={13} className="text-[#2D6A4F]" />
        <p className="text-[11px] font-bold text-[#2D6A4F]">Phrase Chunks — real-life usage {pIdx + 1}/{wordObj.phrases.length}</p>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center">
        <p className="text-[10px] font-bold text-black/30 mb-4">HOW WOULD YOU SAY THIS?</p>
        <div className="bg-[#111] rounded-3xl p-6 w-full text-center mb-6">
          <p className="text-white/50 text-sm mb-4 italic">"{wordObj.phraseMeanings[pIdx]}"</p>
          <button onClick={() => setShown(true)} className={cn("transition-all font-black text-2xl", shown ? "text-[#FFBE0B]" : "text-white/20 bg-white/5 rounded-xl px-4 py-2")}>
            {shown ? wordObj.phrases[pIdx] : "tap to reveal"}
          </button>
        </div>
        {shown && (
          <div className="w-full bg-white border-2 border-black/6 rounded-2xl p-4 mb-4">
            <p className="text-[10px] font-bold text-black/30 mb-1">SAY IT OUT LOUD 3×</p>
            <p className="text-xl font-black text-[#111] mb-1">{wordObj.phrases[pIdx]}</p>
            <p className="text-sm text-black/50">{wordObj.phraseMeanings[pIdx]}</p>
          </div>
        )}
        {shown && (
          <button onClick={() => { setShown(false); setPIdx(i => i + 1); }}
            className="w-full py-3.5 rounded-full bg-[#6246EA] text-white font-black text-sm">
            {pIdx + 1 < wordObj.phrases.length ? "Next phrase →" : "All done — test me →"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── SHELLS & LAYOUT ──────────────────────────────────────────────
function PhoneShell({ children }) {
  return (
    <div className="w-[320px] min-h-[640px] rounded-[2.5rem] bg-[#111] p-[6px] shadow-2xl mx-auto flex-shrink-0">
      <div className="w-full min-h-full rounded-[2.1rem] bg-[#FAFAF8] overflow-hidden flex flex-col relative">
        {children}
      </div>
    </div>
  );
}

function TopBar({ label, onBack, onAction, actionLabel }) {
  return (
    <div className="flex items-center justify-between px-5 pt-5 pb-2">
      {onBack
        ? <button onClick={onBack} className="w-8 h-8 flex items-center justify-center rounded-full bg-black/5"><ChevronLeft size={16} /></button>
        : <span className="text-[10px] tracking-[0.22em] font-bold text-black/30">{label}</span>}
      {onAction
        ? <button onClick={onAction} className="text-[11px] font-bold text-[#EF3E4A]">{actionLabel}</button>
        : onBack ? <span className="text-[10px] tracking-[0.22em] font-bold text-black/30">{label}</span> : null}
    </div>
  );
}

// ─── MAIN SCREENS ─────────────────────────────────────────────────

function SplashScreen({ onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 1800); return () => clearTimeout(t); }, []);
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-[#111] rounded-[2.1rem]">
      <div className="text-7xl font-black text-white mb-2" style={{ fontFamily: "Georgia, serif" }}>ㅋ</div>
      <p className="text-white text-lg font-black">K-Play Korean</p>
      <p className="text-white/30 text-xs mt-1">for real life, not textbooks</p>
    </div>
  );
}

function OnboardingScreen({ onDone }) {
  const [step, setStep] = useState(0);
  const [score, setScore] = useState(0);
  function pick(v) {
    const ns = score + v;
    if (step < QUIZ_ONBOARD.length - 1) { setScore(ns); setStep(s => s + 1); }
    else { onDone(ns <= 1 ? 0 : ns <= 3 ? 1 : ns <= 4 ? 2 : 3); }
  }
  return (
    <div className="flex-1 flex flex-col px-5 pt-6">
      <div className="flex items-center justify-between mb-8">
        <span className="text-[10px] tracking-[0.22em] font-bold text-black/30">K-PLAY KOREAN</span>
        <span className="text-2xl font-black text-[#EF3E4A]" style={{ fontFamily: "Georgia, serif" }}>ㅋ</span>
      </div>
      <div className="flex gap-1.5 mb-8">
        {QUIZ_ONBOARD.map((_, i) => <div key={i} className={cn("h-1 flex-1 rounded-full", i < step ? "bg-[#EF3E4A]" : i === step ? "bg-[#111]" : "bg-black/8")} />)}
      </div>
      <p className="text-[11px] font-bold text-black/35 mb-3">Quick check · {step + 1}/3</p>
      <h2 className="text-xl font-black text-[#111] mb-8 leading-snug">{QUIZ_ONBOARD[step].q}</h2>
      <div className="flex flex-col gap-3">
        {QUIZ_ONBOARD[step].opts.map((o, i) => (
          <button key={i} onClick={() => pick(o.v)}
            className="text-left px-4 py-3.5 rounded-2xl border-2 border-black/8 bg-white text-[#111] font-semibold text-sm active:border-[#EF3E4A] transition-all">
            {o.t}
          </button>
        ))}
      </div>
    </div>
  );
}

function LevelResultScreen({ level, onContinue }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
      <div className="w-20 h-20 rounded-full bg-[#EF3E4A] flex items-center justify-center mb-5 shadow-lg">
        <Check size={32} className="text-white" strokeWidth={3} />
      </div>
      <p className="text-[11px] font-bold text-black/30 tracking-wider mb-2">YOUR STARTING LEVEL</p>
      <h2 className="text-3xl font-black text-[#111] mb-3">{LEVELS[level]}</h2>
      <div className="flex flex-col gap-2 mb-8 w-full max-w-[240px]">
        <div className="bg-[#6246EA]/8 rounded-xl px-3 py-2 flex items-center gap-2">
          <Brain size={13} className="text-[#6246EA]" />
          <p className="text-xs text-[#6246EA] font-semibold">Active Recall → you try first</p>
        </div>
        <div className="bg-[#FFBE0B]/10 rounded-xl px-3 py-2 flex items-center gap-2">
          <Zap size={13} className="text-[#FFBE0B]" />
          <p className="text-xs text-black/50 font-semibold">Micro test every 3 bites</p>
        </div>
        <div className="bg-[#2EC4B6]/8 rounded-xl px-3 py-2 flex items-center gap-2">
          <Clock size={13} className="text-[#2EC4B6]" />
          <p className="text-xs text-[#2EC4B6] font-semibold">Spaced repetition schedules reviews</p>
        </div>
      </div>
      <button onClick={onContinue} className="px-10 py-3.5 rounded-full bg-[#111] text-white font-black text-sm flex items-center gap-2">
        Let's play <ArrowRight size={15} />
      </button>
    </div>
  );
}

function HomeScreen({ level, streak, dayMode, setDayMode, srCards, biteCount, onNav }) {
  const ids = dayMode === "weekday" ? WEEKDAY_IDS : WEEKEND_IDS;
  const bite = getWord(ids[0]);
  const dueCount = srCards.filter(c => c.nextDue <= Date.now()).length;
  const learnedCount = srCards.filter(c => c.reps > 0).length;
  return (
    <div className="flex-1 flex flex-col">
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold text-black/30 tracking-wider">{LEVELS[level]}</p>
          <h1 className="text-lg font-black text-[#111]">What's your Bite today?</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onNav("settings")} className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center">
            <Settings size={14} className="text-black/50" />
          </button>
          <div className="flex items-center gap-1 bg-[#FFBE0B]/15 px-3 py-1.5 rounded-full">
            <Flame size={13} className="text-[#FFBE0B]" />
            <span className="text-sm font-black text-[#111]">{streak}</span>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="px-5 flex gap-2 mb-3">
        <div className="flex-1 bg-white border border-black/6 rounded-xl px-2 py-1.5 text-center">
          <p className="text-base font-black text-[#111]">{learnedCount}</p>
          <p className="text-[9px] text-black/30 font-semibold">learned</p>
        </div>
        <button onClick={() => onNav("review")} className={cn("flex-1 rounded-xl px-2 py-1.5 text-center border", dueCount > 0 ? "bg-[#EF3E4A] border-[#EF3E4A]" : "bg-white border-black/6")}>
          <p className={cn("text-base font-black", dueCount > 0 ? "text-white" : "text-[#111]")}>{dueCount}</p>
          <p className={cn("text-[9px] font-semibold", dueCount > 0 ? "text-white/70" : "text-black/30")}>due review</p>
        </button>
        <div className="flex-1 bg-white border border-black/6 rounded-xl px-2 py-1.5 text-center">
          <p className="text-base font-black text-[#111]">{biteCount}</p>
          <p className="text-[9px] text-black/30 font-semibold">bites done</p>
        </div>
      </div>

      {/* Day toggle */}
      <div className="px-5 mb-3 flex gap-2">
        <button onClick={() => setDayMode("weekday")} className={cn("flex-1 py-2 rounded-full text-xs font-bold", dayMode === "weekday" ? "bg-[#111] text-white" : "bg-black/5 text-black/40")}>
          Weekday · Easy ☀️
        </button>
        <button onClick={() => setDayMode("weekend")} className={cn("flex-1 py-2 rounded-full text-xs font-bold", dayMode === "weekend" ? "bg-[#EF3E4A] text-white" : "bg-black/5 text-black/40")}>
          Weekend · Party 🍺
        </button>
      </div>

      {/* Hero bite */}
      <div className="px-5 mb-3">
        <button onClick={() => onNav("bite")} className="w-full rounded-3xl bg-[#111] p-5 text-left relative overflow-hidden">
          <div className="text-8xl font-black text-white/6 absolute -right-3 -bottom-5 select-none" style={{ fontFamily: "Georgia, serif" }}>ㅋ</div>
          <p className="text-[10px] font-bold text-[#EF3E4A] tracking-wider mb-1">TODAY'S BITE</p>
          <div className="flex items-baseline gap-3 mb-1">
            <h3 className="text-white text-3xl font-black" style={{ fontFamily: "Georgia, serif" }}>{bite.word}</h3>
            <span className="text-white/30 text-sm">{bite.roman}</span>
          </div>
          <p className="text-white/50 text-sm mb-4">{bite.english}</p>
          <div className="flex items-center gap-2">
            <span className="bg-[#EF3E4A] text-white text-xs font-bold px-4 py-2 rounded-full flex items-center gap-1.5">
              <Play size={11} fill="white" /> Play
            </span>
            <span className="text-white/25 text-[11px]">{bite.show.en}</span>
          </div>
        </button>
      </div>

      {/* Quick grid */}
      <div className="px-5 grid grid-cols-4 gap-2">
        {[["games","🍺","Games"],["scan","📷","Scan"],["community","🇰🇷","Natives"],["share","📤","Share"]].map(([s,icon,lbl]) => (
          <button key={s} onClick={() => onNav(s)} className="rounded-2xl bg-white border border-black/6 p-2.5 flex flex-col items-center gap-1">
            <span className="text-xl">{icon}</span>
            <p className="text-[9px] font-bold text-[#111]">{lbl}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// BITE — full 5-phase lesson
function BiteScreen({ wordObj, dayMode, onDone, onBack }) {
  const phases = ["Sounds like", "Bridge", "Phrases", "Drama", "Recall"];
  const [phase, setPhase] = useState(0);
  return (
    <div className="flex-1 flex flex-col">
      <TopBar label={`BITE · ${dayMode === "weekend" ? "PARTY" : "LIGHT"}`} onBack={onBack} />
      <div className="flex gap-1 px-5 mb-3">
        {phases.map((_, i) => <div key={i} className={cn("h-1 flex-1 rounded-full", i < phase ? "bg-[#EF3E4A]" : i === phase ? "bg-[#111]" : "bg-black/8")} />)}
      </div>

      {/* Phase label */}
      <div className="px-5 mb-2">
        <p className="text-[9px] font-bold text-black/25 tracking-wider">{phases[phase].toUpperCase()} · {phase + 1}/{phases.length}</p>
      </div>

      {/* Word header */}
      <div className="px-5 text-center mb-3">
        <p className="text-4xl font-black text-[#111]" style={{ fontFamily: "Georgia, serif" }}>{wordObj.word}</p>
        <p className="text-sm text-black/40">{wordObj.english}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 flex flex-col">
        {/* Phase 0: sounds like + memory hook */}
        {phase === 0 && (
          <div className="flex flex-col gap-3">
            <div className="bg-[#6246EA]/8 rounded-2xl p-4">
              <p className="text-[10px] font-bold text-[#6246EA] mb-1">YOUR BRAIN HEARS</p>
              <p className="text-2xl font-black text-[#6246EA]">"{wordObj.soundsLike}"</p>
            </div>
            <div className="bg-white border-2 border-black/6 rounded-2xl p-4">
              <p className="text-[10px] font-bold text-black/30 mb-1">MEMORY HOOK</p>
              <p className="text-sm text-black/70 leading-relaxed">{wordObj.memoryHook}</p>
            </div>
          </div>
        )}

        {/* Phase 1: pronunciation bridge */}
        {phase === 1 && (
          <div className="flex flex-col gap-3">
            <PronunciationBridge soundsLike={wordObj.soundsLike} roman={wordObj.roman} word={wordObj.word} />
            <div className="bg-white border-2 border-black/6 rounded-2xl p-4">
              <p className="text-[10px] font-bold text-[#EF3E4A] mb-2">HOW TO FIX YOUR PRONUNCIATION</p>
              <p className="text-sm text-black/65 leading-relaxed">{wordObj.bridgeNote}</p>
            </div>
          </div>
        )}

        {/* Phase 2: phrase chunks */}
        {phase === 2 && <PhraseChunkDrill wordObj={wordObj} onDone={() => setPhase(3)} />}

        {/* Phase 3: drama line */}
        {phase === 3 && (
          <div className="flex flex-col gap-3">
            <div className="bg-[#111] rounded-2xl p-5">
              <p className="text-[10px] font-bold text-[#EF3E4A] mb-2">AS HEARD IN</p>
              <p className="text-white font-bold text-base mb-1">"{wordObj.dramaKo}"</p>
              <p className="text-white/40 text-sm mb-3">{wordObj.dramaEn}</p>
              <p className="text-white/20 text-[10px]">{wordObj.show.ko} ({wordObj.show.en})</p>
            </div>
            <div className="bg-white border-2 border-black/6 rounded-2xl p-4">
              <p className="text-[10px] font-bold text-black/30 mb-1">USE IT TODAY</p>
              <p className="text-sm text-black/70 leading-relaxed">{wordObj.useToday}</p>
            </div>
          </div>
        )}

        {/* Phase 4: active recall */}
        {phase === 4 && <RecallCard wordObj={wordObj} onRated={(rating) => onDone(rating)} />}

        {/* Nav button — skip for phase 2 and 4 (those have their own buttons) */}
        {phase !== 2 && phase !== 4 && (
          <button onClick={() => setPhase(p => p + 1)} className="w-full py-3.5 rounded-full bg-[#111] text-white font-black text-sm mt-4 mb-6">
            Next →
          </button>
        )}
        {phase === 4 && <div className="h-6" />}
      </div>
    </div>
  );
}

function GamesScreen({ onBack, onRelay }) {
  return (
    <div className="flex-1 flex flex-col">
      <TopBar label="GROUP GAMES" onBack={onBack} />
      <div className="flex-1 overflow-y-auto px-5 flex flex-col gap-3 pb-4">
        <p className="text-xs text-black/40">Real Korean party games — winners teach losers a new word after each round.</p>
        {GAMES_DATA.map((g, i) => (
          <div key={i} className={cn("bg-white border-2 border-black/6 rounded-2xl p-4", i === 0 && "border-[#EF3E4A]/25")}>
            <div className="flex items-start gap-3">
              <span className="text-2xl">{g.icon}</span>
              <div>
                <p className="text-sm font-black text-[#111] mb-1">{g.name}</p>
                <p className="text-xs text-black/55 mb-1.5 leading-relaxed">{g.rule}</p>
                <p className="text-[11px] text-[#6246EA] font-semibold">{g.tip}</p>
              </div>
            </div>
          </div>
        ))}
        <button onClick={onRelay} className="w-full py-3.5 rounded-full bg-[#EF3E4A] text-white font-black text-sm">
          Try 대박 Relay now →
        </button>
      </div>
    </div>
  );
}

function RelayScreen({ onBack, onShare }) {
  const boosters = ["진짜", "완전", "쩐다", "미쳤다", "레전드"];
  const [chain, setChain] = useState(["오늘 날씨 대박 좋다"]);
  const [idx, setIdx] = useState(0);
  return (
    <div className="flex-1 flex flex-col">
      <TopBar label="대박 RELAY" onBack={onBack} />
      <p className="px-5 text-xs text-black/40 mb-3">Each line must be louder than the last. 4 rounds = 원샷 bragging rights.</p>
      <div className="flex-1 overflow-y-auto px-5 flex flex-col gap-2 mb-3">
        {chain.map((line, i) => (
          <div key={i} className={cn("rounded-2xl px-4 py-3 text-sm font-black", i % 2 === 0 ? "bg-[#111] text-white" : "bg-white border-2 border-black/8 text-[#111]")}>
            {line}
          </div>
        ))}
      </div>
      <div className="px-5 pb-5">
        {chain.length < 4
          ? <button onClick={() => { setChain(c => [...c, `오늘 날씨 대박 ${boosters[idx % boosters.length]}!`]); setIdx(i => i + 1); }}
            className="w-full py-3 rounded-full bg-[#6246EA] text-white font-black text-sm mb-2">+ Go louder</button>
          : <>
            <p className="text-center text-sm font-bold text-[#EF3E4A] mb-2">🔥 4 rounds! 원샷!</p>
            <button onClick={onShare} className="w-full py-3 rounded-full bg-[#EF3E4A] text-white font-black text-sm mb-2">Share this →</button>
          </>
        }
        <button onClick={() => { setChain(["오늘 날씨 대박 좋다"]); setIdx(0); }} className="w-full text-xs text-black/25 font-semibold text-center py-1">Reset</button>
      </div>
    </div>
  );
}

function ScanScreen({ onBack, onCommunity }) {
  const [picked, setPicked] = useState(null);
  const samples = [
    { emoji: "🛑", label: "STOP sign", ko: "정지 (jeong-ji)", note: "Seoul uses the same shape — some newer signs say 멈춤 too. 정지 = more official." },
    { emoji: "🧋", label: "Shake well", ko: "잘 흔들어 주세요", note: "Word for word, Korean cafes say the same. 잘 = well, 흔들어 = shake, 주세요 = please." },
    { emoji: "🏋️", label: "No food or drink", ko: "음식물 반입 금지", note: "금지 = prohibited. You'll see 금지 everywhere in Korea — extremely useful." },
  ];
  return (
    <div className="flex-1 flex flex-col">
      <TopBar label="SCAN & LEARN" onBack={onBack} />
      {!picked
        ? <div className="flex-1 px-5 flex flex-col">
          <div className="rounded-3xl bg-[#111] h-36 flex flex-col items-center justify-center mb-4">
            <Camera size={24} className="text-white/25 mb-2" />
            <p className="text-white/25 text-xs">Real camera coming in v1.1</p>
          </div>
          <button onClick={onCommunity} className="flex items-center justify-between bg-[#2EC4B6]/10 rounded-2xl px-4 py-3 mb-4">
            <span className="text-sm font-bold text-[#111] flex items-center gap-2"><Users size={13} className="text-[#2EC4B6]" /> Ask the Community Wall</span>
            <ChevronRight size={14} className="text-black/25" />
          </button>
          <p className="text-[11px] font-bold text-black/25 mb-2">TRY A SAMPLE SCAN</p>
          <div className="flex flex-col gap-2">
            {samples.map((s, i) => (
              <button key={i} onClick={() => setPicked(s)} className="text-left bg-white border-2 border-black/6 rounded-2xl px-4 py-3 text-sm font-semibold text-[#111]">
                {s.emoji} {s.label}
              </button>
            ))}
          </div>
        </div>
        : <div className="flex-1 px-5 flex flex-col">
          <div className="bg-white border-2 border-black/6 rounded-2xl p-5 mb-4">
            <p className="text-[10px] font-bold text-black/25 mb-1">YOU SCANNED</p>
            <p className="text-sm text-black/50 mb-4">{picked.emoji} {picked.label}</p>
            <div className="h-px bg-black/6 mb-4" />
            <p className="text-[10px] font-bold text-[#EF3E4A] mb-1">IN KOREAN</p>
            <p className="text-2xl font-black text-[#111] mb-3">{picked.ko}</p>
            <p className="text-[10px] font-bold text-[#6246EA] mb-1">WORD BREAKDOWN</p>
            <p className="text-sm text-black/55 leading-relaxed">{picked.note}</p>
          </div>
          <button onClick={onCommunity} className="w-full py-3 rounded-full bg-[#EF3E4A] text-white font-black text-sm mb-2 flex items-center justify-center gap-2">
            <Sparkles size={14} /> Post · let natives react 🇰🇷
          </button>
          <button onClick={() => setPicked(null)} className="w-full py-3 rounded-full bg-black/5 text-black/40 font-bold text-sm">Back</button>
        </div>
      }
    </div>
  );
}

function CommunityScreen({ onBack }) {
  const [hearted, setHearted] = useState({});
  const [detail, setDetail] = useState(null);
  const toggle = (pi, ri) => setHearted(h => ({ ...h, [`${pi}-${ri}`]: !h[`${pi}-${ri}`] }));
  if (detail !== null) {
    const post = COMMUNITY_DATA[detail];
    return (
      <div className="flex-1 flex flex-col">
        <TopBar label="COMMUNITY" onBack={() => setDetail(null)} />
        <div className="px-5 pb-3">
          <div className="bg-[#111] rounded-2xl p-4 flex items-start gap-3 mb-2">
            <span className="text-3xl">{post.emoji}</span>
            <div><p className="text-white text-sm leading-snug">{post.caption}</p><p className="text-white/25 text-[10px] mt-1">{post.by} · {post.time} ago</p></div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 flex flex-col gap-3 pb-3">
          {post.replies.length === 0 && <div className="text-center mt-8"><p className="text-3xl mb-2">🎣</p><p className="text-sm font-bold text-[#111] mb-1">No native replies yet</p><p className="text-xs text-black/35">Share this post to pull some in</p></div>}
          {post.replies.map((r, ri) => {
            const k = `${detail}-${ri}`;
            return (
              <div key={ri} className="bg-white border-2 border-black/6 rounded-2xl px-4 py-3">
                <p className="text-[11px] font-black text-[#2EC4B6] mb-1">{r.who}</p>
                <p className="text-sm text-[#111] mb-2 leading-relaxed">{r.text}</p>
                <button onClick={() => toggle(detail, ri)} className={cn("flex items-center gap-1 text-[11px] font-bold", hearted[k] ? "text-[#EF3E4A]" : "text-black/25")}>
                  <Heart size={12} fill={hearted[k] ? "#EF3E4A" : "none"} /> {r.hearts + (hearted[k] ? 1 : 0)}
                </button>
              </div>
            );
          })}
        </div>
        <div className="px-5 py-3 border-t border-black/6 flex gap-2">
          <div className="flex-1 bg-white border-2 border-black/8 rounded-full px-4 py-2.5 text-sm text-black/20">Add your guess...</div>
          <button className="w-9 h-9 rounded-full bg-[#111] flex items-center justify-center"><Mic size={14} className="text-white" /></button>
        </div>
      </div>
    );
  }
  return (
    <div className="flex-1 flex flex-col">
      <TopBar label="COMMUNITY WALL" onBack={onBack} />
      <p className="px-5 text-xs text-black/35 mb-3">Snap anything → post → 🇰🇷 natives reply</p>
      <div className="flex-1 overflow-y-auto px-5 flex flex-col gap-3 pb-4">
        {COMMUNITY_DATA.map((post, i) => (
          <button key={i} onClick={() => setDetail(i)} className="text-left bg-white border-2 border-black/6 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <span className="text-3xl">{post.emoji}</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-[#111] mb-2 leading-snug">{post.caption}</p>
                <div className="flex items-center gap-3 text-[10px] text-black/30">
                  <span className="flex items-center gap-1"><MessageCircle size={11} /> {post.replies.length} native replies</span>
                  <span>{post.by}</span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ShareScreen({ word, level, streak, onBack }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex-1 flex flex-col">
      <TopBar label="SHARE YOUR BITE" onBack={onBack} />
      <div className="px-5 flex-1 flex flex-col">
        <div className="rounded-3xl bg-[#111] p-6 mb-4 relative overflow-hidden">
          <div className="text-8xl font-black text-white/5 absolute -right-3 -bottom-6 select-none" style={{ fontFamily: "Georgia, serif" }}>ㅋ</div>
          <p className="text-[10px] font-bold text-[#EF3E4A] tracking-widest mb-3">K-PLAY KOREAN</p>
          <p className="text-5xl font-black text-white mb-1" style={{ fontFamily: "Georgia, serif" }}>{word.word}</p>
          <p className="text-white/50 text-sm mb-1">{word.roman}</p>
          <p className="text-white/35 text-sm mb-5">{word.english}</p>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-[#FFBE0B]/20 px-3 py-1.5 rounded-full">
              <Flame size={12} className="text-[#FFBE0B]" /><span className="text-[#FFBE0B] text-xs font-black">{streak} days</span>
            </div>
            <span className="text-white/20 text-[11px]">{LEVELS[level]}</span>
          </div>
        </div>
        <p className="text-[10px] font-bold text-black/25 mb-2 tracking-wider">CAPTION TO COPY</p>
        <div className="bg-white border-2 border-black/6 rounded-2xl p-4 mb-4">
          <p className="text-sm text-[#111] leading-relaxed">Just learned "{word.word}" ({word.roman}) — means {word.english} in Korean 🔥 Day {streak} streak on K-Play Korean. #LearnKorean #KDrama #KPlayKorean #Korean #fyp</p>
        </div>
        <div className="flex flex-col gap-2 mb-6">
          <button className="w-full py-3.5 rounded-full bg-[#111] text-white font-black text-sm flex items-center justify-center gap-2">
            <Share2 size={14} /> Save card for TikTok / Reels
          </button>
          <button onClick={() => setCopied(true)} className={cn("w-full py-3 rounded-full border-2 border-black/8 font-black text-sm", copied ? "text-[#2EC4B6] border-[#2EC4B6]/30" : "text-black/40")}>
            {copied ? "✓ Caption copied!" : "Copy caption"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SettingsScreen({ level, setLevel, onBack }) {
  return (
    <div className="flex-1 flex flex-col">
      <TopBar label="SETTINGS" onBack={onBack} onAction={onBack} actionLabel="Done" />
      <div className="px-5">
        <p className="text-sm font-black text-[#111] mb-1">Your level</p>
        <p className="text-xs text-black/35 mb-4">Adjust anytime — content updates immediately</p>
        <div className="flex flex-col gap-2 mb-6">
          {LEVELS.map((lbl, i) => (
            <button key={lbl} onClick={() => setLevel(i)}
              className={cn("flex items-center justify-between px-4 py-3.5 rounded-2xl border-2 text-sm font-bold", i === level ? "border-[#EF3E4A] bg-[#EF3E4A]/6 text-[#111]" : "border-black/8 bg-white text-black/35")}>
              {lbl} {i === level && <Check size={14} className="text-[#EF3E4A]" />}
            </button>
          ))}
        </div>
        <div className="bg-[#6246EA]/8 rounded-2xl p-4">
          <p className="text-[11px] font-bold text-[#6246EA] mb-1">THE DEAL</p>
          <p className="text-xs text-black/45 leading-relaxed">Sound-alikes help you remember fast — but we always push you toward real pronunciation. That's non-negotiable. 🤝</p>
        </div>
      </div>
    </div>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────
export default function KPlayKorean() {
  const [screen, setScreen] = useState("splash");
  const [level, setLevel] = useState(1);
  const [dayMode, setDayMode] = useState("weekday");
  const [streak] = useState(12);
  const [biteCount, setBiteCount] = useState(0);
  const [showMicroTest, setShowMicroTest] = useState(false);

  // Spaced repetition state — one card per word
  const [srCards, setSrCards] = useState(ALL_WORDS.map(w => initSRCard(w.id)));

  const currentIds = dayMode === "weekday" ? WEEKDAY_IDS : WEEKEND_IDS;
  const currentWord = getWord(currentIds[0]);
  const learnedIds = srCards.filter(c => c.reps > 0).map(c => c.id);
  const dueCards = srCards.filter(c => c.nextDue <= Date.now()).map(c => c.id);

  function handleRate(wordId, rating) {
    setSrCards(prev => prev.map(c => {
      if (c.id !== wordId) return c;
      const { interval, ease } = calcNextInterval(c.interval, c.ease, rating);
      return { ...c, interval, ease, reps: c.reps + 1, nextDue: Date.now() + interval * 60 * 1000, lastRating: rating };
    }));
  }

  function handleBiteDone(rating) {
    handleRate(currentWord.id, rating);
    const newCount = biteCount + 1;
    setBiteCount(newCount);
    if (newCount % 3 === 0 && learnedIds.length >= 2) setShowMicroTest(true);
    else setScreen("share");
  }

  const nav = (s) => setScreen(s);

  return (
    <div className="min-h-screen bg-[#EDE9E3] flex flex-col items-center py-8 px-4">
      <div className="mb-5 text-center">
        <p className="text-[10px] tracking-[0.25em] font-bold text-black/30 mb-0.5">K-PLAY KOREAN · LIVE DEMO</p>
        <p className="text-[11px] text-black/35">Active Recall · Spaced Repetition · Phrase Chunks · Micro Test</p>
      </div>

      <PhoneShell>
        {screen === "splash"       && <SplashScreen onDone={() => nav("onboarding")} />}
        {screen === "onboarding"   && <OnboardingScreen onDone={lvl => { setLevel(lvl); nav("level-result"); }} />}
        {screen === "level-result" && <LevelResultScreen level={level} onContinue={() => nav("home")} />}
        {screen === "home"         && <HomeScreen level={level} streak={streak} dayMode={dayMode} setDayMode={setDayMode} srCards={srCards} biteCount={biteCount} onNav={nav} />}
        {screen === "bite"         && <BiteScreen wordObj={currentWord} dayMode={dayMode} onDone={handleBiteDone} onBack={() => nav("home")} />}
        {screen === "review"       && <ReviewScreen dueCards={dueCards} srCards={srCards} onRate={handleRate} onDone={() => nav("home")} />}
        {screen === "games"        && <GamesScreen onBack={() => nav("home")} onRelay={() => nav("relay")} />}
        {screen === "relay"        && <RelayScreen onBack={() => nav("games")} onShare={() => nav("share")} />}
        {screen === "scan"         && <ScanScreen onBack={() => nav("home")} onCommunity={() => nav("community")} />}
        {screen === "community"    && <CommunityScreen onBack={() => nav("home")} />}
        {screen === "share"        && <ShareScreen word={currentWord} level={level} streak={streak} onBack={() => nav("home")} />}
        {screen === "settings"     && <SettingsScreen level={level} setLevel={setLevel} onBack={() => nav("home")} />}
        {showMicroTest && (
          <div className="absolute inset-0 bg-[#FAFAF8] rounded-[2.1rem] flex flex-col">
            <div className="px-5 pt-5 pb-2 flex items-center justify-between">
              <span className="text-[10px] font-bold text-black/25 tracking-wider">MICRO TEST</span>
              <button onClick={() => { setShowMicroTest(false); nav("share"); }} className="text-xs text-black/25 font-semibold">Skip</button>
            </div>
            <MicroTestScreen learnedIds={learnedIds} onDone={(score, total) => { setShowMicroTest(false); nav("share"); }} />
          </div>
        )}
      </PhoneShell>

      {/* Nav bar outside phone */}
      {!["splash","onboarding","level-result"].includes(screen) && (
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {[["home","🏠"],["bite","📖"],["review","🧠"],["games","🍺"],["scan","📷"],["community","🇰🇷"],["share","📤"]].map(([s,icon]) => (
            <button key={s} onClick={() => nav(s)}
              className={cn("px-3 py-1.5 rounded-full text-xs font-bold transition-all", screen === s ? "bg-[#111] text-white" : "bg-white text-black/35 border border-black/8")}>
              {icon} {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
