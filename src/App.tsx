import { useState, useEffect, useCallback } from "react";
import { Flame, Play, Camera, Settings, Beer, Users, Heart, MessageCircle, Share2, Sparkles, Check, ChevronRight, ChevronLeft, Volume2, Mic, ArrowRight, Brain, Zap, Clock, Trophy, Home, BookOpen, Star } from "lucide-react";

// ─── DESIGN TOKENS ────────────────────────────────────────────────
// Base #FAFAF8 · Card #FFF · Dark #111
// K-red #EF3E4A · Violet #6246EA · Teal #2EC4B6 · Gold #FFBE0B

// ─── KOREAN TTS ───────────────────────────────────────────────────
function speakKorean(text: string) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "ko-KR";
  u.rate = 0.82;
  u.pitch = 1.05;
  window.speechSynthesis.speak(u);
}

// ─── SM-2 SPACED REPETITION ───────────────────────────────────────
function calcNext(interval: number, ease: number, rating: number) {
  if (rating === 1) return { interval: 1, ease: Math.max(1.3, ease - 0.2) };
  if (rating === 2) return { interval: Math.max(1, Math.round(interval * 1.2)), ease: Math.max(1.3, ease - 0.1) };
  if (rating === 3) return { interval: Math.round(interval * ease), ease };
  return { interval: Math.round(interval * ease * 1.3), ease: Math.min(2.5, ease + 0.1) };
}

// ─── CONTENT ──────────────────────────────────────────────────────
const LEVELS = ["Total Newbie","Getting There","Drama Fan","K-Fluent","Almost Native"];

const ALL_WORDS = [
  { id:"daebak", word:"대박", roman:"dae-bak", soundsLike:"day-bahk", english:"OMG! / No way!", phrases:["대박이야!","완전 대박!","대박, 진짜?"], phraseMeanings:["This is insane!","Absolutely insane!","No way, seriously?"], bridgeNote:"The 'ae' in 대 is wider than English 'day' — open your mouth more. '박' cuts off sharp, like flicking a light switch OFF.", dramaKo:"대박, 진짜 너야?", dramaEn:'"No way, is that really you?"', show:{ko:"꽃보다 남자",en:"Boys Over Flowers"}, useToday:"Friend texts you something crazy → reply 대박", memoryHook:"'Day' you realize + 'Bahk' reality hits = MIND BLOWN" },
  { id:"hwaiting", word:"화이팅", roman:"hwa-i-ting", soundsLike:"figh-ting", english:"You got this! / Go!", phrases:["화이팅!","우리 화이팅!","오늘도 화이팅!"], phraseMeanings:["Let's go!","We got this!","Fighting spirit today!"], bridgeNote:"It IS 'fighting' borrowed from English. Say it with your fist raised — that's the full experience.", dramaKo:"화이팅! 넌 할 수 있어!", dramaEn:'"Fighting! You can do it!"', show:{ko:"사랑의 불시착",en:"Crash Landing on You"}, useToday:"Before a friend's exam or job interview — text 화이팅", memoryHook:"It's literally 'fighting' as a cheer. Raise your fist." },
  { id:"eomeo", word:"어머", roman:"eo-meo", soundsLike:"uh-muh", english:"Oh my! / Goodness!", phrases:["어머, 어떡해!","어머나!","어머, 진짜?"], phraseMeanings:["Oh my, what do I do!","Oh my goodness!","Oh my, really?"], bridgeNote:"Not 'mama' — barely move your mouth. Like you saw something and forgot how to speak for a second.", dramaKo:"어머, 이게 뭐야?", dramaEn:'"Oh my, what is this?"', show:{ko:"도깨비",en:"Guardian: The Lonely and Great God"}, useToday:"When something surprises you — wide eyes, open mouth, then: 어머", memoryHook:"'Uh-muh' — the sound you make when you literally can't even" },
  { id:"wonsyat", word:"원샷", roman:"won-syat", soundsLike:"one-shot", english:"Down it! / Bottoms up!", phrases:["자, 원샷!","원샷 해!","원샷이야!"], phraseMeanings:["Alright, down it!","Down it now!","It's a bottoms up!"], bridgeNote:"Literally 'one shot' borrowed from English. Said LOUD = it's absolutely on. Tone carries everything here.", dramaKo:"자, 원샷!", dramaEn:'"Alright, bottoms up!"', show:{ko:"이태원 클라쓰",en:"Itaewon Class"}, useToday:"Game loser moment — point and call 원샷!", memoryHook:"It's 'one shot'. You already know this one." },
  { id:"ya", word:"야", roman:"ya", soundsLike:"yah", english:"Hey! (close friends only)", phrases:["야, 잠깐!","야, 들어봐!","야야야!"], phraseMeanings:["Hey, hold on!","Hey, listen!","Hey hey hey!"], bridgeNote:"One syllable, snapped short. ONLY with close friends — with strangers it's rude. Snap it, don't drag it out.", dramaKo:"야, 너 지금 어디야?", dramaEn:'"Hey, where are you right now?"', show:{ko:"응답하라 1988",en:"Reply 1988"}, useToday:"Catch a close friend's attention across a loud room with: 야!", memoryHook:"Yah! Like a pirate's 'yes' — one shot, direct." },
  { id:"daebakida", word:"대박이다", roman:"dae-bak-i-da", soundsLike:"day-bahk-ee-dah", english:"This IS insane (full statement)", phrases:["이거 대박이다!","진짜 대박이다","완전 대박이다!"], phraseMeanings:["This is insane!","This is genuinely incredible","This is absolutely insane!"], bridgeNote:"대박 (OMG) + 이다 (it IS) = official confirmation, no debate. Longer = more emphatic.", dramaKo:"이 음식 대박이다!", dramaEn:'"This food is INSANE!"', show:{ko:"식샤를 합시다",en:"Let's Eat"}, useToday:"When food, moment, or view hits different — declare it: 대박이다", memoryHook:"대박 (wow) + 이다 (it is) = confirmed wow, no take-backs" }
];
const WEEKDAY_IDS = ["daebak","hwaiting","eomeo"];
const WEEKEND_IDS = ["wonsyat","ya","daebakida"];
const QUIZ_ONBOARD = [
  { q:"When a K-drama character yells 대박 — you feel:", opts:[{t:"Never heard it",v:0},{t:"Heard it, fuzzy on meaning",v:1},{t:"Know exactly when to use it",v:2}] },
  { q:"Watching K-drama without subtitles:", opts:[{t:"Complete mystery",v:0},{t:"I catch a few words",v:1},{t:"I follow the general plot",v:2}] },
  { q:"Your Hangul reading:", opts:[{t:"What's Hangul?",v:0},{t:"I can sound it out slowly",v:1},{t:"I read it even if I don't know words",v:2}] }
];
const COMMUNITY_DATA = [
  { emoji:"🛑", caption:"Found this at a Chicago crosswalk — what would Seoul streets say?", by:"@chicago_kdrama", time:"2h", replies:[{who:"민지 🇰🇷 Native",text:"Seoul crosswalk buttons say '길을 건너세요' (cross the road)! Same vibe, totally different phrase 😄",hearts:312},{who:"서현 🇰🇷 Native",text:"We also show '남은 시간' (time remaining) on the countdown — we love countdown timers 😂",hearts:89}] },
  { emoji:"🧋", caption:"My boba cup says 'shake well' — Seoul cafe version?", by:"@nyc_bobafan", time:"5h", replies:[{who:"준호 🇰🇷 Native",text:"잘 흔들어 주세요 — you'll see this exact phrase in Korean cafes! Way more polite-sounding 😊",hearts:441}] },
  { emoji:"🏋️", caption:"Gym rules sign — what do Korean gyms put on theirs?", by:"@la_gymrat", time:"1d", replies:[] }
];

// ─── HELPERS ──────────────────────────────────────────────────────
function cn(...a: (string|boolean|undefined)[]) { return a.filter(Boolean).join(" "); }
function shuffle<T>(arr: T[]): T[] { return [...arr].sort(() => Math.random() - 0.5); }
function getWord(id: string) { return ALL_WORDS.find(w => w.id === id)!; }
function initSR(id: string) { return { id, interval:1, ease:2.0, reps:0, nextDue:Date.now(), lastRating:null as number|null }; }

// ─── PHONE SHELL ──────────────────────────────────────────────────
function PhoneShell({ children, tabBar }: { children: React.ReactNode; tabBar?: React.ReactNode }) {
  return (
    <div className="w-[340px] h-[680px] rounded-[2.8rem] bg-[#111] p-[7px] shadow-2xl mx-auto flex-shrink-0">
      <div className="w-full h-full rounded-[2.3rem] bg-[#FAFAF8] overflow-hidden flex flex-col relative">
        <div className="flex-1 overflow-hidden flex flex-col">{children}</div>
        {tabBar}
      </div>
    </div>
  );
}

// ─── BOTTOM TAB BAR (inside phone) ────────────────────────────────
const TABS = [
  { id:"home",  icon:<Home size={16}/>,      label:"Home"    },
  { id:"bite",  icon:<BookOpen size={16}/>,  label:"Bite"    },
  { id:"games", icon:<Beer size={16}/>,      label:"Games"   },
  { id:"scan",  icon:<Camera size={16}/>,    label:"Scan"    },
  { id:"community", icon:<Users size={16}/>, label:"Natives" },
];
function TabBar({ screen, onNav }: { screen:string; onNav:(s:string)=>void }) {
  return (
    <div className="flex-shrink-0 border-t border-black/6 bg-white/80 backdrop-blur-sm px-2 py-2 flex justify-around items-center">
      {TABS.map(t => {
        const active = screen === t.id;
        return (
          <button key={t.id} onClick={() => onNav(t.id)}
            className={cn("flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-all",
              active ? "text-[#EF3E4A]" : "text-black/25")}>
            {t.icon}
            <span className={cn("text-[9px] font-bold", active ? "text-[#EF3E4A]" : "text-black/25")}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── PRONUNCIATION BRIDGE ─────────────────────────────────────────
function PronunciationBridge({ soundsLike, roman, word }: { soundsLike:string; roman:string; word:string }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <div className="rounded-2xl border-2 border-black/8 bg-white p-4 mb-3">
      <p className="text-[9px] font-bold text-black/25 tracking-wider mb-3">PRONUNCIATION BRIDGE</p>
      <div className="flex items-center gap-2">
        <div className="flex-1 text-center bg-[#6246EA]/6 rounded-xl p-2">
          <p className="text-[9px] text-[#6246EA]/60 mb-1 font-semibold">YOUR BRAIN HEARS</p>
          <p className="text-sm font-black text-[#6246EA]">"{soundsLike}"</p>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-8 h-0.5 bg-gradient-to-r from-[#6246EA] to-[#EF3E4A]" />
          <p className="text-[8px] text-black/20">→</p>
        </div>
        <button onClick={() => { setRevealed(true); speakKorean(word); }}
          className={cn("flex-1 text-center rounded-xl p-2 transition-all", revealed ? "bg-[#EF3E4A]/6" : "bg-black/4")}>
          <p className="text-[9px] text-[#EF3E4A]/60 mb-1 font-semibold">REAL KOREAN</p>
          <p className={cn("text-sm font-black transition-all", revealed ? "text-[#EF3E4A]" : "text-black/15")}>{revealed ? word : "tap →"}</p>
        </button>
        <button onClick={() => speakKorean(word)}
          className="w-9 h-9 rounded-full bg-[#EF3E4A] flex items-center justify-center flex-shrink-0 shadow-sm active:scale-95">
          <Volume2 size={14} className="text-white" />
        </button>
      </div>
      {revealed && <p className="text-[11px] text-black/40 mt-3 pt-2 border-t border-black/6 leading-relaxed">{roman}</p>}
    </div>
  );
}

// ─── ACTIVE RECALL CARD ───────────────────────────────────────────
function RecallCard({ wordObj, onRated }: { wordObj: typeof ALL_WORDS[0]; onRated:(v:number)=>void }) {
  const [flipped, setFlipped] = useState(false);
  const [rated, setRated] = useState(false);
  const ratings = [
    { v:1, label:"Forgot",  cls:"bg-red-50 text-red-500 border-red-200" },
    { v:2, label:"Hard",    cls:"bg-orange-50 text-orange-500 border-orange-200" },
    { v:3, label:"Got it",  cls:"bg-[#2EC4B6]/10 text-[#2EC4B6] border-[#2EC4B6]/20" },
    { v:4, label:"Easy",    cls:"bg-green-50 text-green-600 border-green-200" },
  ];
  return (
    <div className="flex-1 flex flex-col px-5 pt-2">
      <div className="bg-[#6246EA]/8 rounded-2xl px-3 py-2 mb-3 flex items-center gap-2">
        <Brain size={12} className="text-[#6246EA]" />
        <p className="text-[10px] font-bold text-[#6246EA]">Active Recall — try to remember before flipping</p>
      </div>
      <button onClick={() => { setFlipped(true); if (flipped) speakKorean(wordObj.word); }}
        className={cn("flex-1 rounded-3xl border-2 p-5 flex flex-col items-center justify-center transition-all mb-3", flipped ? "border-[#EF3E4A]/20 bg-white" : "border-black/8 bg-white active:scale-[0.98]")}>
        {!flipped ? (
          <>
            <p className="text-[10px] font-bold text-black/25 mb-4">WHAT DOES THIS MEAN?</p>
            <p className="text-5xl font-black text-[#111] mb-2" style={{fontFamily:"Georgia,serif"}}>{wordObj.word}</p>
            <p className="text-sm text-black/35">{wordObj.roman}</p>
            <p className="text-[11px] text-[#6246EA] mt-4 font-semibold">Tap to reveal →</p>
          </>
        ) : (
          <>
            <p className="text-[10px] font-bold text-[#EF3E4A] mb-2">ANSWER</p>
            <button onClick={() => speakKorean(wordObj.word)} className="text-3xl font-black text-[#111] mb-2 flex items-center gap-2" style={{fontFamily:"Georgia,serif"}}>
              {wordObj.word} <Volume2 size={16} className="text-[#EF3E4A]" />
            </button>
            <p className="text-base font-bold text-[#EF3E4A] mb-3">{wordObj.english}</p>
            <div className="flex flex-wrap gap-1.5 justify-center">
              {wordObj.phrases.map((p,i) => (
                <button key={i} onClick={() => speakKorean(p)} className="bg-[#6246EA]/8 text-[#6246EA] text-[10px] font-semibold px-2 py-1 rounded-lg flex items-center gap-1">
                  {p} <Volume2 size={9}/>
                </button>
              ))}
            </div>
          </>
        )}
      </button>
      {flipped && !rated && (
        <div className="mb-3">
          <p className="text-[10px] font-bold text-black/25 text-center mb-2">HOW DID YOU DO?</p>
          <div className="grid grid-cols-4 gap-1.5">
            {ratings.map(r => (
              <button key={r.v} onClick={() => { setRated(true); setTimeout(() => onRated(r.v), 300); }}
                className={cn("py-2.5 rounded-xl border-2 text-[10px] font-black", r.cls)}>
                {r.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {rated && <p className="text-center text-sm font-bold text-[#2EC4B6] mb-3">✓ Saved to review schedule</p>}
    </div>
  );
}

// ─── MICRO TEST ───────────────────────────────────────────────────
function MicroTestScreen({ learnedIds, onDone }: { learnedIds:string[]; onDone:(s:number,t:number)=>void }) {
  const learned = learnedIds.map(getWord).filter(Boolean);
  const [qIdx, setQIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState<string|null>(null);
  const [done, setDone] = useState(false);
  const questions = shuffle(learned).slice(0,Math.min(3,learned.length)).map(target => ({
    target, opts: shuffle([target, ...shuffle(learned.filter(w=>w.id!==target.id)).slice(0,3)])
  }));
  if (questions.length === 0) { onDone(0,0); return null; }
  const q = questions[qIdx];
  function pick(word: typeof ALL_WORDS[0]) {
    if (answered) return;
    setAnswered(word.id);
    if (word.id === q.target.id) { speakKorean("정답!"); setScore(s=>s+1); }
    else speakKorean("아니요");
    setTimeout(() => {
      if (qIdx+1 < questions.length) { setQIdx(i=>i+1); setAnswered(null); }
      else setDone(true);
    }, 900);
  }
  if (done) return (
    <div className="flex-1 flex flex-col items-center justify-center px-5 text-center">
      <div className="w-16 h-16 rounded-full bg-[#FFBE0B] flex items-center justify-center mb-4">
        <Trophy size={28} className="text-white"/>
      </div>
      <p className="text-[10px] font-bold text-black/25 mb-1">MICRO TEST</p>
      <p className="text-3xl font-black text-[#111] mb-2">{score}/{questions.length}</p>
      <p className="text-sm text-black/45 mb-6">{score===questions.length?"Perfect! Intervals extended 🚀":score>=questions.length/2?"Good — keep going":"These words need more reps"}</p>
      <button onClick={() => onDone(score,questions.length)} className="px-8 py-3 rounded-full bg-[#111] text-white font-black text-sm">Continue</button>
    </div>
  );
  return (
    <div className="flex-1 flex flex-col px-5 pt-3">
      <div className="flex gap-1 mb-3">
        {questions.map((_,i) => <div key={i} className={cn("h-1 flex-1 rounded-full", i<qIdx?"bg-[#FFBE0B]":i===qIdx?"bg-[#111]":"bg-black/8")}/>)}
      </div>
      <div className="bg-[#FFBE0B]/10 rounded-xl px-3 py-2 mb-3 flex items-center gap-1.5">
        <Zap size={12} className="text-[#FFBE0B]"/><p className="text-[10px] font-bold text-black/45">Micro Test — {qIdx+1}/{questions.length}</p>
      </div>
      <button onClick={() => speakKorean(q.target.word)} className="bg-[#111] rounded-3xl p-5 flex flex-col items-center mb-4 active:scale-[0.98]">
        <p className="text-4xl font-black text-white mb-1" style={{fontFamily:"Georgia,serif"}}>{q.target.word}</p>
        <p className="text-white/30 text-xs mb-1">{q.target.roman}</p>
        <div className="flex items-center gap-1 text-white/25 text-[10px]"><Volume2 size={10}/> tap to hear</div>
      </button>
      <p className="text-[10px] font-bold text-black/25 text-center mb-2">WHICH MEANING?</p>
      <div className="grid grid-cols-2 gap-2">
        {q.opts.map(opt => {
          const isTarget = opt.id===q.target.id, isThis = answered===opt.id, isAnswered = answered!==null;
          return (
            <button key={opt.id} onClick={() => pick(opt)}
              className={cn("py-3 px-2 rounded-2xl border-2 text-xs font-bold text-center transition-all",
                isAnswered&&isTarget?"border-[#2EC4B6] bg-[#2EC4B6]/10 text-[#2EC4B6]":
                isAnswered&&isThis&&!isTarget?"border-red-300 bg-red-50 text-red-500":
                "border-black/8 bg-white text-[#111]")}>
              {opt.english}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── 369 INTERACTIVE GAME ─────────────────────────────────────────
function Game369({ onBack }: { onBack:()=>void }) {
  const [count, setCount] = useState(1);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [feedback, setFeedback] = useState<string|null>(null);
  const [gameOver, setGameOver] = useState(false);
  const isClap = (n:number) => n%3===0||n%6===0||n%9===0 || String(n).includes("3")||String(n).includes("6")||String(n).includes("9");
  const clap = isClap(count);

  function tap(action:"number"|"clap") {
    const correct = (action==="clap" && clap) || (action==="number" && !clap);
    if (correct) {
      speakKorean(clap?"짝!":String(count));
      setFeedback("✓");
      setScore(s=>s+1);
      setCount(c=>c+1);
    } else {
      speakKorean("아이쿠!");
      setFeedback("원샷!");
      const newLives = lives-1;
      setLives(newLives);
      if (newLives<=0) { setGameOver(true); return; }
      setCount(c=>c+1);
    }
    setTimeout(() => setFeedback(null), 700);
  }

  if (gameOver) return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-5">
      <p className="text-4xl mb-3">🍺</p>
      <p className="text-xl font-black text-[#111] mb-1">원샷 x3!</p>
      <p className="text-sm text-black/45 mb-2">You reached number {count-1}</p>
      <p className="text-2xl font-black text-[#EF3E4A] mb-6">Score: {score}</p>
      <button onClick={() => { setCount(1); setScore(0); setLives(3); setGameOver(false); }} className="px-8 py-3 rounded-full bg-[#111] text-white font-black text-sm">Play again</button>
      <button onClick={onBack} className="mt-2 text-xs text-black/30 font-semibold">Back to games</button>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col px-5 pt-3">
      <div className="flex items-center justify-between mb-3">
        <button onClick={onBack} className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center"><ChevronLeft size={15}/></button>
        <span className="text-[10px] font-bold text-black/30 tracking-wider">삼육구 LIVE GAME</span>
        <div className="flex gap-0.5">{[...Array(3)].map((_,i)=><span key={i} className={i<lives?"text-red-400":"text-black/10"}>❤️</span>)}</div>
      </div>
      <div className="flex justify-between mb-3">
        <div className="bg-white border border-black/8 rounded-xl px-3 py-1.5 text-center"><p className="text-lg font-black text-[#111]">{score}</p><p className="text-[9px] text-black/30">score</p></div>
        <div className={cn("rounded-xl px-4 py-1.5 text-center transition-all", clap?"bg-[#EF3E4A] scale-105":"bg-white border border-black/8")}>
          <p className={cn("text-2xl font-black", clap?"text-white":"text-[#111]")}>{count}</p>
          <p className={cn("text-[9px] font-bold", clap?"text-white/70":"text-black/30")}>{clap?"CLAP!":"say it"}</p>
        </div>
        <div className="bg-white border border-black/8 rounded-xl px-3 py-1.5 text-center"><p className="text-lg font-black text-[#111]">{lives}</p><p className="text-[9px] text-black/30">lives</p></div>
      </div>
      {feedback && (
        <div className={cn("rounded-2xl py-2 text-center text-lg font-black mb-3 transition-all", feedback==="✓"?"bg-[#2EC4B6]/15 text-[#2EC4B6]":"bg-[#EF3E4A]/15 text-[#EF3E4A]")}>
          {feedback}
        </div>
      )}
      <p className="text-[10px] text-black/35 text-center mb-4">Multiple of 3/6/9 or contains 3/6/9? → 👏 CLAP. Otherwise → say the number</p>
      <div className="flex gap-3 flex-1 items-stretch">
        <button onClick={() => tap("number")} className="flex-1 rounded-3xl bg-white border-2 border-black/8 flex flex-col items-center justify-center active:scale-95 transition-all">
          <p className="text-3xl font-black text-[#111] mb-1">{count}</p>
          <p className="text-[10px] font-bold text-black/35">Say number</p>
        </button>
        <button onClick={() => tap("clap")} className="flex-1 rounded-3xl bg-[#111] flex flex-col items-center justify-center active:scale-95 transition-all">
          <p className="text-3xl mb-1">👏</p>
          <p className="text-[10px] font-bold text-white/50">Clap!</p>
        </button>
      </div>
      <p className="text-[9px] text-black/20 text-center mt-3">Wrong = 원샷! 3 wrong = game over</p>
    </div>
  );
}

// ─── TOP BAR ──────────────────────────────────────────────────────
function TopBar({ label, onBack, right }: { label:string; onBack?:()=>void; right?:React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 pt-4 pb-1 flex-shrink-0">
      {onBack ? <button onClick={onBack} className="w-8 h-8 flex items-center justify-center rounded-full bg-black/5"><ChevronLeft size={15}/></button>
              : <span className="text-[9px] tracking-[0.2em] font-bold text-black/25">{label}</span>}
      {right ?? (onBack ? <span className="text-[9px] tracking-[0.2em] font-bold text-black/25">{label}</span> : null)}
    </div>
  );
}

// ─── PHRASE DRILL ─────────────────────────────────────────────────
function PhraseChunkDrill({ wordObj, onDone }: { wordObj:typeof ALL_WORDS[0]; onDone:()=>void }) {
  const [pIdx, setPIdx] = useState(0);
  const [shown, setShown] = useState(false);
  if (pIdx>=wordObj.phrases.length) return (
    <div className="flex-1 flex flex-col items-center justify-center px-5 text-center">
      <p className="text-3xl mb-3">✅</p>
      <p className="font-black text-[#111] text-base mb-1">All phrases drilled!</p>
      <p className="text-xs text-black/40 mb-6">Your brain stored {wordObj.word} in 3 real-life contexts.</p>
      <button onClick={onDone} className="px-8 py-3 rounded-full bg-[#EF3E4A] text-white font-black text-sm">Test myself →</button>
    </div>
  );
  return (
    <div className="flex-1 flex flex-col px-5 pt-1">
      <div className="bg-green-50 rounded-xl px-3 py-1.5 mb-3 flex items-center gap-1.5">
        <Sparkles size={11} className="text-green-600"/><p className="text-[10px] font-bold text-green-700">Phrase Chunks {pIdx+1}/{wordObj.phrases.length}</p>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center">
        <p className="text-[10px] font-bold text-black/25 mb-4">HOW WOULD YOU SAY THIS?</p>
        <div className="bg-[#111] rounded-3xl p-5 w-full text-center mb-4">
          <p className="text-white/45 text-sm mb-4 italic">"{wordObj.phraseMeanings[pIdx]}"</p>
          <button onClick={() => { setShown(true); speakKorean(wordObj.phrases[pIdx]); }}
            className={cn("font-black text-xl transition-all", shown?"text-[#FFBE0B]":"text-white/15 bg-white/5 rounded-xl px-4 py-2")}>
            {shown ? wordObj.phrases[pIdx] : "tap to reveal"}
          </button>
        </div>
        {shown && (
          <>
            <button onClick={() => speakKorean(wordObj.phrases[pIdx])} className="flex items-center gap-2 bg-white border-2 border-black/6 rounded-2xl px-4 py-3 mb-4 w-full">
              <Volume2 size={16} className="text-[#EF3E4A] flex-shrink-0"/>
              <div><p className="text-base font-black text-[#111]">{wordObj.phrases[pIdx]}</p><p className="text-xs text-black/40">{wordObj.phraseMeanings[pIdx]}</p></div>
            </button>
            <button onClick={() => { setShown(false); setPIdx(i=>i+1); }} className="w-full py-3 rounded-full bg-[#6246EA] text-white font-black text-sm">
              {pIdx+1<wordObj.phrases.length?"Next phrase →":"All done — test me →"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── SCREENS ──────────────────────────────────────────────────────
function SplashScreen({ onDone }: { onDone:()=>void }) {
  useEffect(() => { const t = setTimeout(onDone, 1800); return () => clearTimeout(t); }, []);
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-[#111] rounded-[2.3rem]">
      <div className="text-8xl font-black text-white mb-2" style={{fontFamily:"Georgia,serif"}}>ㅋ</div>
      <p className="text-white text-xl font-black">K-Play Korean</p>
      <p className="text-white/30 text-xs mt-1">for real life, not textbooks</p>
    </div>
  );
}

function OnboardingScreen({ onDone }: { onDone:(lvl:number)=>void }) {
  const [step, setStep] = useState(0); const [score, setScore] = useState(0);
  function pick(v:number) { const ns=score+v; if (step<QUIZ_ONBOARD.length-1){setScore(ns);setStep(s=>s+1);}else{onDone(ns<=1?0:ns<=3?1:ns<=4?2:3);} }
  return (
    <div className="flex-1 flex flex-col px-5 pt-6">
      <div className="flex items-center justify-between mb-8">
        <span className="text-[9px] tracking-[0.2em] font-bold text-black/25">K-PLAY KOREAN</span>
        <span className="text-2xl font-black text-[#EF3E4A]" style={{fontFamily:"Georgia,serif"}}>ㅋ</span>
      </div>
      <div className="flex gap-1.5 mb-8">{QUIZ_ONBOARD.map((_,i)=><div key={i} className={cn("h-1 flex-1 rounded-full",i<step?"bg-[#EF3E4A]":i===step?"bg-[#111]":"bg-black/8")}/>)}</div>
      <p className="text-[10px] font-bold text-black/30 mb-3">Quick check · {step+1}/3</p>
      <h2 className="text-lg font-black text-[#111] mb-8 leading-snug">{QUIZ_ONBOARD[step].q}</h2>
      <div className="flex flex-col gap-2.5">
        {QUIZ_ONBOARD[step].opts.map((o,i)=>(
          <button key={i} onClick={()=>pick(o.v)} className="text-left px-4 py-3.5 rounded-2xl border-2 border-black/8 bg-white text-[#111] font-semibold text-sm active:border-[#EF3E4A]">{o.t}</button>
        ))}
      </div>
    </div>
  );
}

function LevelResultScreen({ level, onContinue }: { level:number; onContinue:()=>void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
      <div className="w-20 h-20 rounded-full bg-[#EF3E4A] flex items-center justify-center mb-5 shadow-lg">
        <Check size={32} className="text-white" strokeWidth={3}/>
      </div>
      <p className="text-[10px] font-bold text-black/25 tracking-wider mb-2">YOUR STARTING LEVEL</p>
      <h2 className="text-3xl font-black text-[#111] mb-6">{LEVELS[level]}</h2>
      <div className="flex flex-col gap-2 mb-8 w-full max-w-[220px]">
        {[["#6246EA","Active Recall — you try first"],["#FFBE0B","Micro test every 3 bites"],["#2EC4B6","Spaced repetition schedules reviews"],["#EF3E4A","Real Korean TTS pronunciation"]].map(([c,t])=>(
          <div key={t} className="rounded-xl px-3 py-2 flex items-center gap-2" style={{background:`${c}15`}}>
            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{background:c}}/>
            <p className="text-xs font-semibold text-black/50">{t}</p>
          </div>
        ))}
      </div>
      <button onClick={onContinue} className="px-10 py-3.5 rounded-full bg-[#111] text-white font-black text-sm flex items-center gap-2">Let's play <ArrowRight size={14}/></button>
    </div>
  );
}

function HomeScreen({ level, streak, dayMode, setDayMode, srCards, biteCount, onNav }: any) {
  const ids = dayMode==="weekday"?WEEKDAY_IDS:WEEKEND_IDS;
  const bite = getWord(ids[0]);
  const dueCount = srCards.filter((c:any)=>c.nextDue<=Date.now()).length;
  const learnedCount = srCards.filter((c:any)=>c.reps>0).length;
  return (
    <div className="flex-1 overflow-y-auto flex flex-col">
      <div className="px-4 pt-4 pb-2 flex items-center justify-between flex-shrink-0">
        <div><p className="text-[9px] font-bold text-black/25 tracking-wider">{LEVELS[level].toUpperCase()}</p><h1 className="text-base font-black text-[#111]">What's your Bite today?</h1></div>
        <div className="flex items-center gap-2">
          <button onClick={()=>onNav("settings")} className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center"><Settings size={13} className="text-black/40"/></button>
          <div className="flex items-center gap-1 bg-[#FFBE0B]/15 px-2.5 py-1.5 rounded-full"><Flame size={12} className="text-[#FFBE0B]"/><span className="text-sm font-black text-[#111]">{streak}</span></div>
        </div>
      </div>
      <div className="px-4 flex gap-2 mb-3">
        <div className="flex-1 bg-white border border-black/6 rounded-xl px-2 py-1.5 text-center"><p className="text-sm font-black text-[#111]">{learnedCount}</p><p className="text-[9px] text-black/25 font-semibold">learned</p></div>
        <button onClick={()=>onNav("review")} className={cn("flex-1 rounded-xl px-2 py-1.5 text-center border",dueCount>0?"bg-[#EF3E4A] border-[#EF3E4A]":"bg-white border-black/6")}>
          <p className={cn("text-sm font-black",dueCount>0?"text-white":"text-[#111]")}>{dueCount}</p>
          <p className={cn("text-[9px] font-semibold",dueCount>0?"text-white/70":"text-black/25")}>due review</p>
        </button>
        <div className="flex-1 bg-white border border-black/6 rounded-xl px-2 py-1.5 text-center"><p className="text-sm font-black text-[#111]">{biteCount}</p><p className="text-[9px] text-black/25 font-semibold">bites done</p></div>
      </div>
      <div className="px-4 mb-3 flex gap-2">
        <button onClick={()=>setDayMode("weekday")} className={cn("flex-1 py-1.5 rounded-full text-[10px] font-bold",dayMode==="weekday"?"bg-[#111] text-white":"bg-black/5 text-black/35")}>Weekday ☀️</button>
        <button onClick={()=>setDayMode("weekend")} className={cn("flex-1 py-1.5 rounded-full text-[10px] font-bold",dayMode==="weekend"?"bg-[#EF3E4A] text-white":"bg-black/5 text-black/35")}>Weekend 🍺</button>
      </div>
      <div className="px-4 mb-3">
        <button onClick={()=>onNav("bite")} className="w-full rounded-3xl bg-[#111] p-5 text-left relative overflow-hidden">
          <div className="text-7xl font-black text-white/5 absolute -right-2 -bottom-4 select-none" style={{fontFamily:"Georgia,serif"}}>ㅋ</div>
          <p className="text-[9px] font-bold text-[#EF3E4A] tracking-wider mb-1">TODAY'S BITE</p>
          <div className="flex items-baseline gap-2 mb-1">
            <h3 className="text-white text-2xl font-black" style={{fontFamily:"Georgia,serif"}}>{bite.word}</h3>
            <button onClick={(e)=>{e.stopPropagation();speakKorean(bite.word);}} className="text-white/30 flex items-center gap-1 text-[10px]"><Volume2 size={10}/></button>
          </div>
          <p className="text-white/45 text-xs mb-3">{bite.english}</p>
          <span className="bg-[#EF3E4A] text-white text-[10px] font-bold px-3 py-1.5 rounded-full inline-flex items-center gap-1"><Play size={10} fill="white"/>Play</span>
        </button>
      </div>
      <div className="px-4">
        <button onClick={()=>onNav("share")} className="w-full flex items-center justify-between bg-[#FFBE0B]/10 rounded-2xl px-4 py-3">
          <p className="text-sm font-black text-[#111]">🔥 {streak} day streak</p>
          <span className="text-xs font-bold text-[#EF3E4A] flex items-center gap-1"><Share2 size={11}/> Share</span>
        </button>
      </div>
    </div>
  );
}

function BiteScreen({ wordObj, dayMode, onDone, onBack }: any) {
  const phases = ["Sounds like","Bridge","Phrases","Drama","Recall"];
  const [phase, setPhase] = useState(0);
  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <TopBar label={`BITE · ${dayMode==="weekend"?"PARTY":"LIGHT"}`} onBack={onBack}/>
      <div className="flex gap-1 px-4 mb-2 flex-shrink-0">{phases.map((_,i)=><div key={i} className={cn("h-0.5 flex-1 rounded-full",i<phase?"bg-[#EF3E4A]":i===phase?"bg-[#111]":"bg-black/8")}/>)}</div>
      <div className="px-4 mb-2 flex-shrink-0">
        <p className="text-[9px] font-bold text-black/20 tracking-wider">{phases[phase].toUpperCase()} · {phase+1}/{phases.length}</p>
      </div>
      <div className="px-4 text-center mb-3 flex-shrink-0">
        <button onClick={()=>speakKorean(wordObj.word)} className="text-3xl font-black text-[#111] inline-flex items-center gap-2" style={{fontFamily:"Georgia,serif"}}>
          {wordObj.word} <Volume2 size={16} className="text-[#EF3E4A]"/>
        </button>
        <p className="text-xs text-black/35">{wordObj.english}</p>
      </div>
      <div className="flex-1 overflow-y-auto px-4">
        {phase===0&&<div className="flex flex-col gap-3">
          <div className="bg-[#6246EA]/8 rounded-2xl p-4"><p className="text-[9px] font-bold text-[#6246EA] mb-1">YOUR BRAIN HEARS</p><p className="text-xl font-black text-[#6246EA]">"{wordObj.soundsLike}"</p></div>
          <div className="bg-white border-2 border-black/6 rounded-2xl p-4"><p className="text-[9px] font-bold text-black/25 mb-1">MEMORY HOOK</p><p className="text-sm text-black/60 leading-relaxed">{wordObj.memoryHook}</p></div>
        </div>}
        {phase===1&&<div className="flex flex-col gap-3">
          <PronunciationBridge soundsLike={wordObj.soundsLike} roman={wordObj.roman} word={wordObj.word}/>
          <div className="bg-white border-2 border-black/6 rounded-2xl p-4"><p className="text-[9px] font-bold text-[#EF3E4A] mb-2">HOW TO FIX YOUR PRONUNCIATION</p><p className="text-sm text-black/60 leading-relaxed">{wordObj.bridgeNote}</p></div>
        </div>}
        {phase===2&&<PhraseChunkDrill wordObj={wordObj} onDone={()=>setPhase(3)}/>}
        {phase===3&&<div className="flex flex-col gap-3">
          <div className="bg-[#111] rounded-2xl p-4">
            <p className="text-[9px] font-bold text-[#EF3E4A] mb-2">AS HEARD IN</p>
            <button onClick={()=>speakKorean(wordObj.dramaKo)} className="text-white font-bold text-sm mb-1 flex items-center gap-2">"{wordObj.dramaKo}" <Volume2 size={12}/></button>
            <p className="text-white/35 text-xs mb-2">{wordObj.dramaEn}</p>
            <p className="text-white/15 text-[10px]">{wordObj.show.ko} ({wordObj.show.en})</p>
          </div>
          <div className="bg-white border-2 border-black/6 rounded-2xl p-4"><p className="text-[9px] font-bold text-black/25 mb-1">USE IT TODAY</p><p className="text-sm text-black/60 leading-relaxed">{wordObj.useToday}</p></div>
        </div>}
        {phase===4&&<RecallCard wordObj={wordObj} onRated={onDone}/>}
        {phase!==2&&phase!==4&&<button onClick={()=>setPhase(p=>p+1)} className="w-full py-3 rounded-full bg-[#111] text-white font-black text-sm mt-3 mb-4">Next →</button>}
        {phase===4&&<div className="h-6"/>}
      </div>
    </div>
  );
}

function GamesScreen({ onBack, onPlay369 }: { onBack:()=>void; onPlay369:()=>void }) {
  const games = [
    { icon:"3️⃣6️⃣9️⃣", name:"삼육구 (Sam-yuk-gu)", desc:"Tap 👏 on multiples of 3/6/9, tap the number otherwise. Miss = 원샷!", action:onPlay369, cta:"Play now →", highlight:true },
    { icon:"🔤", name:"끝말잇기 (Word Relay)", desc:"Last syllable of one word = first of the next. In Korean. Loser buys next round.", action:null, cta:"Coming soon" },
    { icon:"🎤", name:"노래 릴레이 (Song Relay)", desc:"Sing 2 K-pop lines → next person starts a new song with your last word.", action:null, cta:"Coming soon" },
    { icon:"🤫", name:"진실 게임 (Truth Game)", desc:"진실 (truth) or 거짓말 (lie — everyone guesses). Wrong = 원샷.", action:null, cta:"Coming soon" },
  ];
  return (
    <div className="flex-1 overflow-y-auto">
      <TopBar label="GROUP GAMES" onBack={onBack}/>
      <div className="px-4 pb-4 flex flex-col gap-2.5">
        <p className="text-[10px] text-black/35 mb-1">Real Korean party games. Winners teach losers a new word each round.</p>
        {games.map((g,i)=>(
          <div key={i} className={cn("bg-white border-2 rounded-2xl p-4", g.highlight?"border-[#EF3E4A]/25":"border-black/6")}>
            <div className="flex items-start gap-3">
              <span className="text-2xl">{g.icon}</span>
              <div className="flex-1">
                <p className="text-sm font-black text-[#111] mb-1">{g.name}</p>
                <p className="text-xs text-black/50 mb-2 leading-relaxed">{g.desc}</p>
                {g.action
                  ? <button onClick={g.action} className="bg-[#EF3E4A] text-white text-[10px] font-black px-3 py-1.5 rounded-full">{g.cta}</button>
                  : <span className="text-[10px] text-black/25 font-semibold">{g.cta}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScanScreen({ onBack, onCommunity }: { onBack:()=>void; onCommunity:()=>void }) {
  const [picked, setPicked] = useState<any>(null);
  const samples = [
    { emoji:"🛑", label:"STOP sign", ko:"정지 (jeong-ji)", note:"정지 is the official term. Seoul uses the same octagon. 정 = stop, 지 = remain." },
    { emoji:"🧋", label:"Shake well", ko:"잘 흔들어 주세요", note:"잘 = well · 흔들어 = shake · 주세요 = please. Used in Korean cafes word-for-word." },
    { emoji:"🏋️", label:"No food or drink", ko:"음식물 반입 금지", note:"금지 = prohibited. You'll see 금지 everywhere in Korea — very useful word." },
  ];
  return (
    <div className="flex-1 overflow-y-auto">
      <TopBar label="SCAN & LEARN" onBack={onBack}/>
      {!picked
        ? <div className="px-4 flex flex-col">
          <div className="rounded-3xl bg-[#111] h-28 flex flex-col items-center justify-center mb-3"><Camera size={22} className="text-white/20 mb-1"/><p className="text-white/20 text-[10px]">Real camera · coming in v1.1</p></div>
          <button onClick={onCommunity} className="flex items-center justify-between bg-[#2EC4B6]/10 rounded-2xl px-4 py-3 mb-3">
            <span className="text-sm font-bold text-[#111] flex items-center gap-2"><Users size={13} className="text-[#2EC4B6]"/>Ask the Community</span>
            <ChevronRight size={14} className="text-black/25"/>
          </button>
          <p className="text-[10px] font-bold text-black/25 mb-2">TRY A SAMPLE SCAN</p>
          <div className="flex flex-col gap-2">
            {samples.map((s,i)=><button key={i} onClick={()=>setPicked(s)} className="text-left bg-white border-2 border-black/6 rounded-2xl px-4 py-3 text-sm font-semibold text-[#111]">{s.emoji} {s.label}</button>)}
          </div>
        </div>
        : <div className="px-4 flex flex-col">
          <div className="bg-white border-2 border-black/6 rounded-2xl p-5 mb-3">
            <p className="text-[9px] font-bold text-black/25 mb-1">SCANNED</p>
            <p className="text-sm text-black/45 mb-3">{picked.emoji} {picked.label}</p>
            <div className="h-px bg-black/6 mb-3"/>
            <p className="text-[9px] font-bold text-[#EF3E4A] mb-1">IN KOREAN</p>
            <button onClick={()=>speakKorean(picked.ko.split(" ")[0])} className="text-xl font-black text-[#111] mb-3 flex items-center gap-2">{picked.ko} <Volume2 size={14} className="text-[#EF3E4A]"/></button>
            <p className="text-[9px] font-bold text-[#6246EA] mb-1">WORD BREAKDOWN</p>
            <p className="text-xs text-black/50 leading-relaxed">{picked.note}</p>
          </div>
          <button onClick={onCommunity} className="w-full py-3 rounded-full bg-[#EF3E4A] text-white font-black text-sm mb-2 flex items-center justify-center gap-2"><Sparkles size={13}/>Post · let natives react 🇰🇷</button>
          <button onClick={()=>setPicked(null)} className="w-full py-2 text-xs text-black/30 font-semibold">Back</button>
        </div>
      }
    </div>
  );
}

function CommunityScreen({ onBack }: { onBack:()=>void }) {
  const [hearted, setHearted] = useState<Record<string,boolean>>({});
  const [detail, setDetail] = useState<number|null>(null);
  const toggle = (pi:number,ri:number) => setHearted(h=>({...h,[`${pi}-${ri}`]:!h[`${pi}-${ri}`]}));
  if (detail!==null) {
    const post = COMMUNITY_DATA[detail];
    return (
      <div className="flex-1 overflow-hidden flex flex-col">
        <TopBar label="POST" onBack={()=>setDetail(null)}/>
        <div className="px-4 pb-2 flex-shrink-0">
          <div className="bg-[#111] rounded-2xl p-4 flex items-start gap-3">
            <span className="text-3xl">{post.emoji}</span>
            <div><p className="text-white text-sm leading-snug">{post.caption}</p><p className="text-white/25 text-[10px] mt-1">{post.by} · {post.time}</p></div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 flex flex-col gap-2.5 pb-2">
          {post.replies.length===0&&<div className="text-center mt-8"><p className="text-3xl mb-2">🎣</p><p className="text-sm font-bold text-[#111] mb-1">No native replies yet</p><p className="text-xs text-black/30">Share to pull some in</p></div>}
          {post.replies.map((r,ri)=>{
            const k=`${detail}-${ri}`;
            return <div key={ri} className="bg-white border-2 border-black/6 rounded-2xl px-4 py-3">
              <p className="text-[10px] font-black text-[#2EC4B6] mb-1">{r.who}</p>
              <p className="text-sm text-[#111] mb-2 leading-relaxed">{r.text}</p>
              <button onClick={()=>toggle(detail,ri)} className={cn("flex items-center gap-1 text-[10px] font-bold",hearted[k]?"text-[#EF3E4A]":"text-black/25")}>
                <Heart size={11} fill={hearted[k]?"#EF3E4A":"none"}/> {r.hearts+(hearted[k]?1:0)}
              </button>
            </div>;
          })}
        </div>
        <div className="px-4 py-3 border-t border-black/6 flex gap-2 flex-shrink-0">
          <div className="flex-1 bg-white border-2 border-black/8 rounded-full px-3 py-2 text-xs text-black/20">Add your guess...</div>
          <button className="w-9 h-9 rounded-full bg-[#111] flex items-center justify-center"><Mic size={13} className="text-white"/></button>
        </div>
      </div>
    );
  }
  return (
    <div className="flex-1 overflow-y-auto">
      <TopBar label="COMMUNITY WALL" onBack={onBack}/>
      <p className="px-4 text-[10px] text-black/30 mb-3">Snap anything → post → 🇰🇷 natives reply with the Korean</p>
      <div className="px-4 flex flex-col gap-2.5 pb-4">
        {COMMUNITY_DATA.map((post,i)=>(
          <button key={i} onClick={()=>setDetail(i)} className="text-left bg-white border-2 border-black/6 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <span className="text-3xl">{post.emoji}</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-[#111] mb-2 leading-snug">{post.caption}</p>
                <div className="flex items-center gap-3 text-[10px] text-black/25">
                  <span className="flex items-center gap-1"><MessageCircle size={10}/> {post.replies.length} native replies</span>
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

function ShareScreen({ word, level, streak, onBack }: any) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex-1 overflow-y-auto">
      <TopBar label="SHARE" onBack={onBack}/>
      <div className="px-4 flex flex-col">
        <div className="rounded-3xl bg-[#111] p-6 mb-4 relative overflow-hidden">
          <div className="text-8xl font-black text-white/4 absolute -right-3 -bottom-6 select-none" style={{fontFamily:"Georgia,serif"}}>ㅋ</div>
          <p className="text-[9px] font-bold text-[#EF3E4A] tracking-widest mb-3">K-PLAY KOREAN</p>
          <button onClick={()=>speakKorean(word.word)} className="text-5xl font-black text-white mb-1 flex items-center gap-2" style={{fontFamily:"Georgia,serif"}}>{word.word} <Volume2 size={16} className="text-white/30"/></button>
          <p className="text-white/40 text-sm mb-1">{word.roman}</p>
          <p className="text-white/25 text-sm mb-5">{word.english}</p>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-[#FFBE0B]/20 px-3 py-1.5 rounded-full"><Flame size={11} className="text-[#FFBE0B]"/><span className="text-[#FFBE0B] text-xs font-black">{streak} days</span></div>
            <span className="text-white/15 text-[10px]">{LEVELS[level]}</span>
          </div>
        </div>
        <p className="text-[9px] font-bold text-black/25 mb-2 tracking-wider">CAPTION TO COPY</p>
        <div className="bg-white border-2 border-black/6 rounded-2xl p-4 mb-4">
          <p className="text-xs text-[#111] leading-relaxed">Just learned "{word.word}" ({word.roman}) — means {word.english} in Korean 🔥 Day {streak} streak on K-Play Korean. Try it yourself ↓ #LearnKorean #KDrama #KPlayKorean #Korean #fyp</p>
        </div>
        <div className="flex flex-col gap-2 mb-4">
          <button className="w-full py-3.5 rounded-full bg-[#111] text-white font-black text-sm flex items-center justify-center gap-2"><Share2 size={13}/> Save card for TikTok / Reels</button>
          <button onClick={()=>setCopied(true)} className={cn("w-full py-3 rounded-full border-2 border-black/8 font-black text-sm",copied?"text-[#2EC4B6] border-[#2EC4B6]/30":"text-black/35")}>{copied?"✓ Caption copied!":"Copy caption"}</button>
        </div>
      </div>
    </div>
  );
}

function ReviewScreen({ dueCards, onRate, onDone }: any) {
  const [idx, setIdx] = useState(0);
  if (dueCards.length===0) return (
    <div className="flex-1 flex flex-col items-center justify-center px-5 text-center">
      <Clock size={32} className="text-black/15 mb-3"/><p className="font-black text-[#111] mb-1">All caught up!</p>
      <p className="text-xs text-black/35 mb-6">Come back later for review.</p>
      <button onClick={onDone} className="px-8 py-3 rounded-full bg-[#111] text-white font-black text-sm">Back</button>
    </div>
  );
  const wordObj = getWord(dueCards[idx]);
  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className="px-4 pt-4 pb-1 flex items-center justify-between flex-shrink-0">
        <span className="text-[9px] font-bold text-black/25 tracking-wider">REVIEW · {idx+1}/{dueCards.length}</span>
        <button onClick={onDone} className="text-xs text-black/25 font-semibold">Skip</button>
      </div>
      <RecallCard wordObj={wordObj} onRated={(r)=>{ onRate(wordObj.id,r); if(idx+1<dueCards.length)setIdx(i=>i+1); else onDone(); }}/>
    </div>
  );
}

function SettingsScreen({ level, setLevel, onBack }: any) {
  return (
    <div className="flex-1 overflow-y-auto">
      <TopBar label="SETTINGS" onBack={onBack} right={<button onClick={onBack} className="text-[11px] font-bold text-[#EF3E4A]">Done</button>}/>
      <div className="px-4">
        <p className="text-sm font-black text-[#111] mb-1">Your level</p>
        <p className="text-xs text-black/30 mb-4">Change anytime — content updates immediately</p>
        <div className="flex flex-col gap-2 mb-6">
          {LEVELS.map((lbl,i)=>(
            <button key={lbl} onClick={()=>setLevel(i)} className={cn("flex items-center justify-between px-4 py-3 rounded-2xl border-2 text-sm font-bold",i===level?"border-[#EF3E4A] bg-[#EF3E4A]/6 text-[#111]":"border-black/8 bg-white text-black/30")}>
              {lbl}{i===level&&<Check size={14} className="text-[#EF3E4A]"/>}
            </button>
          ))}
        </div>
        <div className="bg-[#6246EA]/8 rounded-2xl p-4">
          <p className="text-[10px] font-bold text-[#6246EA] mb-1">THE DEAL</p>
          <p className="text-xs text-black/40 leading-relaxed">Sound-alikes help you remember fast — but we always correct you toward real pronunciation. Non-negotiable. 🤝</p>
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
  const [srCards, setSrCards] = useState(ALL_WORDS.map(w=>initSR(w.id)));
  const [playing369, setPlaying369] = useState(false);

  const currentIds = dayMode==="weekday"?WEEKDAY_IDS:WEEKEND_IDS;
  const currentWord = getWord(currentIds[0]);
  const learnedIds = srCards.filter(c=>c.reps>0).map(c=>c.id);
  const dueCards = srCards.filter(c=>c.nextDue<=Date.now()).map(c=>c.id);

  function handleRate(wordId:string, rating:number) {
    setSrCards(prev=>prev.map(c=>{
      if(c.id!==wordId)return c;
      const {interval,ease}=calcNext(c.interval,c.ease,rating);
      return {...c,interval,ease,reps:c.reps+1,nextDue:Date.now()+interval*60*1000,lastRating:rating};
    }));
  }

  function handleBiteDone(rating:number) {
    handleRate(currentWord.id,rating);
    const newCount=biteCount+1; setBiteCount(newCount);
    if(newCount%3===0&&learnedIds.length>=2) setShowMicroTest(true);
    else setScreen("share");
  }

  const nav = (s:string) => setScreen(s);
  const showTabs = !["splash","onboarding","level-result"].includes(screen) && !showMicroTest;
  const hiddenTabScreens = ["bite","review","settings","share"];

  if (screen==="splash") return <div className="min-h-screen bg-[#EDE9E3] flex items-center justify-center"><PhoneShell><SplashScreen onDone={()=>nav("onboarding")}/></PhoneShell></div>;
  if (screen==="onboarding") return <div className="min-h-screen bg-[#EDE9E3] flex items-center justify-center"><PhoneShell><OnboardingScreen onDone={lvl=>{setLevel(lvl);nav("level-result");}}/></PhoneShell></div>;
  if (screen==="level-result") return <div className="min-h-screen bg-[#EDE9E3] flex items-center justify-center"><PhoneShell><LevelResultScreen level={level} onContinue={()=>nav("home")}/></PhoneShell></div>;

  return (
    <div className="min-h-screen bg-[#EDE9E3] flex flex-col items-center justify-center py-8 px-4">
      <div className="mb-4 text-center">
        <p className="text-[9px] tracking-[0.25em] font-bold text-black/25 mb-0.5">K-PLAY KOREAN</p>
        <p className="text-[10px] text-black/30">Active Recall · Spaced Repetition · Korean TTS</p>
      </div>

      <PhoneShell tabBar={showTabs && !hiddenTabScreens.includes(screen) ? <TabBar screen={screen} onNav={nav}/> : undefined}>
        {screen==="home"      && <HomeScreen level={level} streak={streak} dayMode={dayMode} setDayMode={setDayMode} srCards={srCards} biteCount={biteCount} onNav={nav}/>}
        {screen==="bite"      && <BiteScreen wordObj={currentWord} dayMode={dayMode} onDone={handleBiteDone} onBack={()=>nav("home")}/>}
        {screen==="review"    && <ReviewScreen dueCards={dueCards} onRate={handleRate} onDone={()=>nav("home")}/>}
        {screen==="games"     && !playing369 && <GamesScreen onBack={()=>nav("home")} onPlay369={()=>setPlaying369(true)}/>}
        {screen==="games"     && playing369  && <Game369 onBack={()=>setPlaying369(false)}/>}
        {screen==="scan"      && <ScanScreen onBack={()=>nav("home")} onCommunity={()=>nav("community")}/>}
        {screen==="community" && <CommunityScreen onBack={()=>nav("home")}/>}
        {screen==="share"     && <ShareScreen word={currentWord} level={level} streak={streak} onBack={()=>nav("home")}/>}
        {screen==="settings"  && <SettingsScreen level={level} setLevel={setLevel} onBack={()=>nav("home")}/>}

        {showMicroTest && (
          <div className="absolute inset-0 bg-[#FAFAF8] flex flex-col z-50">
            <div className="px-4 pt-4 pb-1 flex items-center justify-between">
              <span className="text-[9px] font-bold text-black/25 tracking-wider">MICRO TEST</span>
              <button onClick={()=>{setShowMicroTest(false);nav("share");}} className="text-xs text-black/25 font-semibold">Skip</button>
            </div>
            <MicroTestScreen learnedIds={learnedIds} onDone={()=>{setShowMicroTest(false);nav("share");}}/>
          </div>
        )}
      </PhoneShell>
    </div>
  );
}
