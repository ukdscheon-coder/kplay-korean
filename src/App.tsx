import { useState, useEffect, useRef, useCallback } from "react";
import { Flame, Play, Camera, Settings, Beer, Users, Heart, MessageCircle, Share2, Sparkles, Check, ChevronRight, ChevronLeft, Volume2, Mic, ArrowRight, Brain, Zap, Clock, Trophy, Home, BookOpen, RotateCcw } from "lucide-react";

// ═══════════════════════════════════════════════════════════════
// AUDIO ENGINE — Google TTS primary, Web Speech fallback
// Fixes: (1) no Korean voice needed locally, (2) punctuation-only bug,
//        (3) iOS Safari restriction, (4) speaking indicator
// ═══════════════════════════════════════════════════════════════

const KOREAN_RE = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/;

function isKorean(text: string) { return KOREAN_RE.test(text); }

// Clean text before speaking - strip English romanization cues
function cleanForSpeech(text: string): string {
  return text.replace(/["""'']/g, "").trim();
}

const _speakListeners = new Set<(v: boolean) => void>();
let _globalSpeaking = false;

function _setSpeaking(v: boolean) {
  _globalSpeaking = v;
  _speakListeners.forEach(fn => fn(v));
}

// Primary: Google Translate TTS (works client-side, no API key needed)
function speakViaGoogleTTS(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const url = `https://translate.googleapis.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(cleanForSpeech(text))}&tl=ko&client=gtx&ttsspeed=0.8`;
    const audio = new Audio(url);
    audio.crossOrigin = "anonymous";
    _setSpeaking(true);
    audio.onended  = () => { _setSpeaking(false); resolve(); };
    audio.onerror  = () => { _setSpeaking(false); reject(); };
    audio.play().catch(reject);
  });
}

// Fallback: Web Speech API with Korean voice detection
function speakViaWebSpeech(text: string): void {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const voices = window.speechSynthesis.getVoices();
  const koVoice = voices.find(v => v.lang === "ko-KR")
                || voices.find(v => v.lang.startsWith("ko"))
                || null;
  if (!koVoice) { _setSpeaking(false); return; } // don't speak English with Korean chars
  const u = new SpeechSynthesisUtterance(cleanForSpeech(text));
  u.lang   = "ko-KR";
  u.voice  = koVoice;
  u.rate   = 0.82;
  u.pitch  = 1.05;
  u.onstart = () => _setSpeaking(true);
  u.onend   = () => _setSpeaking(false);
  u.onerror = () => _setSpeaking(false);
  window.speechSynthesis.speak(u);
}

export function speakKorean(text: string) {
  if (!text || !isKorean(text)) return; // guard: only speak actual Korean
  speakViaGoogleTTS(text).catch(() => speakViaWebSpeech(text));
}

// Speaking indicator hook
function useSpeaking() {
  const [speaking, setSpeaking] = useState(false);
  useEffect(() => {
    _speakListeners.add(setSpeaking);
    return () => { _speakListeners.delete(setSpeaking); };
  }, []);
  return speaking;
}

// Pulsing speaker button
function SpeakBtn({ text, size = 14, dark = false, label }: { text: string; size?: number; dark?: boolean; label?: string }) {
  const speaking = useSpeaking();
  const hasKorean = isKorean(text);
  if (!hasKorean) return null;
  return (
    <button onClick={e => { e.stopPropagation(); speakKorean(text); }}
      className={`relative flex items-center gap-1.5 flex-shrink-0 rounded-full ${dark ? "bg-white/15 hover:bg-white/25" : "bg-[#EF3E4A]/10 hover:bg-[#EF3E4A]/20"} px-2.5 py-1.5 transition-all active:scale-95`}
      title="Tap to hear Korean">
      <Volume2 size={size} className={dark ? "text-white" : "text-[#EF3E4A]"} />
      {label && <span className={`text-[9px] font-bold ${dark ? "text-white/70" : "text-[#EF3E4A]"}`}>{label}</span>}
      {speaking && <span className="absolute inset-0 rounded-full bg-[#EF3E4A]/20 animate-ping pointer-events-none" />}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════
// SPACED REPETITION (SM-2)
// ═══════════════════════════════════════════════════════════════
function calcNext(interval: number, ease: number, rating: number) {
  if (rating === 1) return { interval: 1,                           ease: Math.max(1.3, ease - 0.2) };
  if (rating === 2) return { interval: Math.max(1, Math.round(interval * 1.2)), ease: Math.max(1.3, ease - 0.1) };
  if (rating === 3) return { interval: Math.round(interval * ease),             ease };
  return               { interval: Math.round(interval * ease * 1.3),           ease: Math.min(2.5, ease + 0.1) };
}

// ═══════════════════════════════════════════════════════════════
// CONTENT — 50-year educator lens + 2026 trends
// Structure: hear → situation → bridge → phrases → drama → recall
// Added: cultural insider tip, usage score, emotion tag
// ═══════════════════════════════════════════════════════════════
const LEVELS = ["Total Newbie", "Getting There", "Drama Fan", "K-Fluent", "Almost Native"];

const ALL_WORDS = [
  {
    id: "daebak", word: "대박", roman: "dae-bak",
    soundsLike: "day-bahk",
    english: "OMG! / No way!",
    emotion: "😱 surprise + delight",
    situation: "Your friend just showed you the most unbelievable news on their phone",
    whenToUse: ["Something genuinely surprised you", "Good news lands unexpectedly", "A drama plot twist happens"],
    whenNOT: ["Formal work situations", "With strangers — sounds too casual"],
    phrases: [{ ko: "대박이야!", en: "This is insane!", note: "Statement version — stronger" }, { ko: "완전 대박!", en: "Absolutely wild!", note: "완전 (completely) amplifies it" }, { ko: "대박, 진짜?", en: "No way, seriously?", note: "Question — you can't believe it" }],
    bridgeNote: "Your mouth says 'day-bahk' — but make the 'ae' wider, like a dentist's 'say ahhh'. The '박' stops sharp, like a door slamming shut. Short, punchy.",
    dramaKo: "대박, 진짜 너야?", dramaEn: '"No way, is that really you?"',
    show: { ko: "꽃보다 남자", en: "Boys Over Flowers" },
    insiderTip: "Koreans say 대박 the same way Americans say 'holy cow' — the emotion in your voice matters more than perfect pronunciation. Say it with wide eyes.",
    memoryHook: "The 'Day' you find out → 'Bahk' — reality hits you. MIND BLOWN",
    level: 0,
  },
  {
    id: "hwaiting", word: "화이팅", roman: "hwa-i-ting",
    soundsLike: "figh-ting",
    english: "You got this! / Let's go!",
    emotion: "💪 encouragement",
    situation: "Your friend is about to take an exam, job interview, or first date",
    whenToUse: ["Before a challenge", "During a hard moment", "Cheering someone on"],
    whenNOT: ["After someone fails — use 괜찮아 (it's okay) instead"],
    phrases: [{ ko: "화이팅!", en: "Let's go!", note: "Standalone cheer" }, { ko: "우리 화이팅!", en: "We got this!", note: "우리 = us/we, team spirit" }, { ko: "오늘도 화이팅!", en: "Keep going today too!", note: "Morning motivation" }],
    bridgeNote: "It IS 'fighting' — borrowed from English 100%. The 'hwa' is just how 'fi' sounds when Koreans borrowed it. Raise your fist when you say it. That IS the correct form.",
    dramaKo: "화이팅! 넌 할 수 있어!", dramaEn: '"Fighting! You can do it!"',
    show: { ko: "사랑의 불시착", en: "Crash Landing on You" },
    insiderTip: "Koreans actually text 'ㅎㅇㅌ' as shorthand. If a Korean texts you this, they're cheering you on.",
    memoryHook: "It's literally 'fighting'. You already know it — just say it with a fist pump.",
    level: 0,
  },
  {
    id: "eomeo", word: "어머", roman: "eo-meo",
    soundsLike: "uh-muh",
    english: "Oh my! / Goodness!",
    emotion: "😮 soft shock",
    situation: "You see something unexpected — cute, surprising, or slightly shocking",
    whenToUse: ["Light surprise or delight", "When something cute happens", "Gentle shock"],
    whenNOT: ["Big shocks — use 세상에 (oh my goodness) or 헐 (wow, that's a lot) instead"],
    phrases: [{ ko: "어머나!", en: "Oh my goodness!", note: "어머 + 나 = more emphatic" }, { ko: "어머, 어떡해!", en: "Oh my, what do I do!", note: "어떡해 = what to do" }, { ko: "어머, 진짜?", en: "Oh my, really?", note: "Softer than 대박 for surprise" }],
    bridgeNote: "'Uh-muh' — barely move your mouth. It's a sound you make before words arrive. Like seeing a puppy so cute you forgot how to speak. Soft, not loud.",
    dramaKo: "어머, 이게 뭐야?", dramaEn: '"Oh my, what is this?"',
    show: { ko: "도깨비", en: "Guardian: The Lonely and Great God" },
    insiderTip: "어머 is more feminine-coded in Korean culture. Males more often use 헐 or 세상에. Using 어머 as a male speaker is fine with close friends but sounds very soft otherwise.",
    memoryHook: "'Uh-muh' — the sound you make when you CAN'T EVEN.",
    level: 0,
  },
  {
    id: "wonsyat", word: "원샷", roman: "won-syat",
    soundsLike: "one-shot",
    english: "Down it! / Bottoms up!",
    emotion: "🍺 party command",
    situation: "Someone in your group loses a game, everyone points at them and calls it",
    whenToUse: ["Party/drinking games", "Group celebration moments", "When someone loses"],
    whenNOT: ["Professional settings", "With elderly Koreans you don't know well"],
    phrases: [{ ko: "자, 원샷!", en: "Alright, down it!", note: "자 = 'alright' or 'come on'" }, { ko: "원샷 해!", en: "Do it in one!", note: "Direct command, casual" }, { ko: "원샷이야!", en: "It's a bottoms up!", note: "Declaring the rule" }],
    bridgeNote: "It's 'one shot' borrowed directly. The '원' sounds like 'one', '샷' sounds like 'shot'. You literally already know this word. The tone does everything — shout it.",
    dramaKo: "자, 원샷!", dramaEn: '"Alright, bottoms up!"',
    show: { ko: "이태원 클라쓰", en: "Itaewon Class" },
    insiderTip: "In Korean drinking culture, refusing 원샷 is considered slightly rude unless you have a reason. If you don't drink, say '저 못 마셔요' (I can't drink) — Koreans are very understanding about this.",
    memoryHook: "It's 'one shot'. You already know this word. Just say it louder.",
    level: 1,
  },
  {
    id: "ya", word: "야", roman: "ya",
    soundsLike: "yah",
    english: "Hey! (friends only)",
    emotion: "🗣️ direct call",
    situation: "Across a loud room — you need to get a close friend's attention immediately",
    whenToUse: ["Close friends of equal age", "Casual text to someone you're very familiar with"],
    whenNOT: ["Anyone older than you", "Strangers — extremely rude", "Acquaintances you're not close with"],
    phrases: [{ ko: "야, 잠깐!", en: "Hey, hold on!", note: "잠깐 = just a moment" }, { ko: "야야야!", en: "Hey hey hey!", note: "Repeated = more urgent/funny" }, { ko: "야, 들어봐!", en: "Hey, listen to this!", note: "들어봐 = listen/hear this" }],
    bridgeNote: "One syllable, snapped short. Don't drag it. 'Yah' — like a pirate, one shot. The shorter and sharper, the more natural it sounds. Dragging it to 'yaaaaah' sounds unnatural.",
    dramaKo: "야, 너 지금 어디야?", dramaEn: '"Hey, where are you right now?"',
    show: { ko: "응답하라 1988", en: "Reply 1988" },
    insiderTip: "Koreans are very age-sensitive. '야' is ONLY for people your age or younger. Using 야 to someone even 1 year older is considered very rude. To someone older, say '저기요' (excuse me).",
    memoryHook: "Yah! One shot, like a pirate's 'yes'. Short and direct.",
    level: 1,
  },
  {
    id: "daebakida", word: "대박이다", roman: "dae-bak-i-da",
    soundsLike: "day-bahk-ee-dah",
    english: "This IS insane. (full declaration)",
    emotion: "😤 confirmed amazement",
    situation: "The food is unbelievable, the view hits different, the moment is perfect",
    whenToUse: ["Full sentence declaration", "When 대박 alone isn't enough", "Slower, more emphatic situations"],
    whenNOT: ["Quick reactions (use 대박 alone)", "When speaking casually in rapid conversation"],
    phrases: [{ ko: "이거 진짜 대박이다!", en: "This is genuinely insane!", note: "진짜 = genuinely, for real" }, { ko: "이 음식 대박이다!", en: "This food is INCREDIBLE!", note: "음식 = food" }, { ko: "완전 대박이다!", en: "Absolutely, completely insane!", note: "완전 = completely" }],
    bridgeNote: "대박 (OMG) + 이다 (it IS) = declared fact, no debate. The 이다 at the end makes it a full sentence. Longer = more deliberate = more emphatic. Say it slowly to land harder.",
    dramaKo: "이 음식 진짜 대박이다!", dramaEn: '"This food is genuinely incredible!"',
    show: { ko: "식샤를 합시다", en: "Let\'s Eat" },
    insiderTip: "대박이다 in a slow exhale after tasting great food is peak Korean emotional expression. Koreans take food VERY seriously — saying this to a Korean who cooked for you is the best compliment.",
    memoryHook: "대박 (wow) + 이다 (it IS) = no take-backs, official declaration.",
    level: 1,
  }
,
  // ── EMOTIONS ─────────────────────────────────────────────────
  { id:"heol", word:"헐", roman:"heol", soundsLike:"hull", english:"Wow / No way / That's a lot", emotion:"😳 shock", situation:"Someone tells you something hard to believe or just too much", whenToUse:["Shocking news","Unbelievable situation","When 대박 is too mild"], whenNOT:["Formal situations","Complimenting — sounds rude"], phrases:[{ko:"헐, 진짜?",en:"No way, for real?",note:"Most common combo"},{ko:"헐, 미쳤다",en:"Wow, crazy",note:"미쳤다=gone crazy"},{ko:"헐 대박",en:"Wow, insane!",note:"Two reactions stacked"}], bridgeNote:"'Hull' — like the hull of a ship, say it fast when shocked. Short, ends abruptly.", dramaKo:"헐, 그게 진짜야?", dramaEn:'"Wow, is that actually real?"', show:{ko:"이상한 변호사 우영우",en:"Extraordinary Attorney Woo"}, insiderTip:"헐 is Gen Z Korean for 'omg'. Older Koreans use 세상에 or 어머. Using 헐 sounds young and current.", memoryHook:"'Hull' — a punch to the hull. Short shock.", level:0 },
  { id:"jinja", word:"진짜", roman:"jin-jja", soundsLike:"jin-jja", english:"Really / For real / Seriously", emotion:"🤨 emphasis", situation:"You want to stress something is true, or can't believe it", whenToUse:["Emphasising any statement","Questioning","Reacting to news"], whenNOT:["Formal writing"], phrases:[{ko:"진짜?",en:"Really?",note:"Rising tone = question"},{ko:"진짜야",en:"It's real",note:"Statement, flat tone"},{ko:"진짜 대박",en:"Seriously insane",note:"진짜 amplifies anything"}], bridgeNote:"Jin-jja. The double 'j' (jj) is tense — lips press harder. Think 'gin-ja' but tighten the 'j'.", dramaKo:"진짜 나 좋아해?", dramaEn:'"Do you really like me?"', show:{ko:"별에서 온 그대",en:"My Love from the Star"}, insiderTip:"진짜 is the Korean equivalent of 'literally' in English. Gen Z Koreans add it before almost anything for emphasis.", memoryHook:"진짜 = genuine. 'Real gin' in real life.", level:0 },
  { id:"michweo", word:"미쳤어", roman:"mi-cheo-sseo", soundsLike:"mee-chuh-ssuh", english:"That's crazy / Are you crazy?", emotion:"🤯 blown away", situation:"Something so good, bad, or shocking your brain short-circuits", whenToUse:["Food is unbelievably good","Someone does something crazy","Amazed reaction"], whenNOT:["Directed at upset person — very harsh"], phrases:[{ko:"미쳤어?",en:"Are you crazy?",note:"Question tone = softer"},{ko:"완전 미쳤다",en:"Absolutely crazy",note:"미쳤다 slightly softer"},{ko:"이거 미쳤어",en:"This is insane",note:"Thing + 미쳤어 = amazing"}], bridgeNote:"Mi-chuh-ssuh. 미 like 'me', 쳤 like 'cha' + past tense 'ssuh'. Say with exhale.", dramaKo:"이 드라마 진짜 미쳤어!", dramaEn:'"This drama is genuinely insane!"', show:{ko:"응답하라 1994",en:"Reply 1994"}, insiderTip:"Koreans say 미쳤어 about amazing food constantly. It's a compliment. '이 김치찌개 미쳤어' = This kimchi jjigae is out of this world.", memoryHook:"'Me-chuh' — ME went crazy it's so good.", level:1 },
  // ── DAILY LIFE ───────────────────────────────────────────────
  { id:"aigoo", word:"아이고", roman:"a-i-go", soundsLike:"eye-go", english:"Oh dear / Goodness / Ugh", emotion:"😩 exasperation/sympathy", situation:"You stub your toe, drop something, or hear bad news from a friend", whenToUse:["Minor pain/frustration","Sympathy for someone","Pleasant surprise"], whenNOT:["Serious emergencies — too casual"], phrases:[{ko:"아이고, 깜짝이야!",en:"Oh goodness, you startled me!",note:"깜짝이야=startled"},{ko:"아이고 힘들어라",en:"Oh dear, this is tough",note:"힘들어라=so hard"},{ko:"아이고 내 새끼",en:"Oh my dear child",note:"Warm, affectionate"}], bridgeNote:"'Eye-go' — literally how Koreans say it. A-i-go. Drawn out when sympathetic, short when frustrated.", dramaKo:"아이고, 허리야!", dramaEn:'"Oh my aching back!"', show:{ko:"응답하라 1988",en:"Reply 1988"}, insiderTip:"아이고 is cross-generational — grandmothers and Gen Z say it equally. One of the most universally Korean sounds.", memoryHook:"'Eye-go' — your eyes go wide. Universal Korean sigh.", level:0 },
  { id:"gwenchana", word:"괜찮아", roman:"gwaen-chan-a", soundsLike:"gwain-chan-ah", english:"It's okay / Are you okay?", emotion:"💚 reassurance", situation:"A friend trips, fails an exam, or is going through something tough", whenToUse:["Comforting someone","Saying you're fine","Asking if someone's okay"], whenNOT:["Dismissing real pain — tone matters"], phrases:[{ko:"괜찮아?",en:"Are you okay?",note:"Rising tone = question"},{ko:"나 괜찮아",en:"I'm okay",note:"나=I"},{ko:"다 괜찮을 거야",en:"Everything will be okay",note:"다=all"}], bridgeNote:"'Gwain-chan-ah'. The 'gw' like Gwen — lips round slightly. 찮 has a nasal 'n'.", dramaKo:"괜찮아, 내가 있잖아.", dramaEn:'"It's okay, I'm right here."', show:{ko:"태양의 후예",en:"Descendants of the Sun"}, insiderTip:"'괜찮아, 내가 있잖아' is one of the most-quoted K-drama lines ever. Saying this to a Korean will make them emotional.", memoryHook:"'Gonna be okay' — gwain-chan-ah sounds like it. Same comfort energy.", level:0 },
  { id:"bbal-li", word:"빨리", roman:"ppal-li", soundsLike:"ppal-lee", english:"Hurry / Quickly", emotion:"⚡ urgency", situation:"Late for something, friend is slow, food is getting cold", whenToUse:["Rushing someone gently","Expressing urgency"], whenNOT:["With elders — add honorifics"], phrases:[{ko:"빨리빨리!",en:"Hurry hurry!",note:"Doubled = more urgent"},{ko:"빨리 와!",en:"Come quickly!",note:"와=come"},{ko:"빨리 먹어!",en:"Eat fast!",note:"먹어=eat"}], bridgeNote:"'Ppal-lee' — double 'l' in the middle. 빨 sounds like 'ppal' with tense lips. Both syllables equal.", dramaKo:"빨리빨리! 늦겠다!", dramaEn:'"Hurry hurry! We're going to be late!"', show:{ko:"런온",en:"Run On"}, insiderTip:"빨리빨리 is famous in Korean culture — the 'ppalli-ppalli spirit' of speed. Koreans are known worldwide for moving fast.", memoryHook:"'Ppal-lee' — your pal running away fast. Go!", level:0 },
  // ── K-DRAMA ESSENTIALS ────────────────────────────────────────
  { id:"saranghae", word:"사랑해", roman:"sa-rang-hae", soundsLike:"sah-rang-hay", english:"I love you", emotion:"❤️ love", situation:"The most climactic moment in every K-drama — rain, eye contact, silence", whenToUse:["Someone you love deeply","Family","Very close friends"], whenNOT:["Too early in dating — Koreans reserve this"], phrases:[{ko:"사랑해",en:"I love you (casual)",note:"Close relationship"},{ko:"사랑해요",en:"I love you (polite)",note:"요=polite"},{ko:"너무 사랑해",en:"I love you so much",note:"너무=so much"}], bridgeNote:"'Sah-rang-hay'. 사=sah, 랑=rang (like rang a bell), 해=hay. Three clear syllables.", dramaKo:"사랑해... 진심으로.", dramaEn:'"I love you... sincerely."', show:{ko:"겨울연가",en:"Winter Sonata"}, insiderTip:"Koreans say 사랑해 less frequently than Western couples. When a Korean says it, it carries enormous weight.", memoryHook:"'Sa-rang-hay' — rang the bell of your heart. Ring ring.", level:0 },
  { id:"mianhae", word:"미안해", roman:"mi-an-hae", soundsLike:"mee-ahn-hay", english:"I'm sorry (casual)", emotion:"😔 apology", situation:"You bumped into a close friend, forgot something, let someone down", whenToUse:["Casual apology to friends/family","Light mistakes"], whenNOT:["Formal apologies — use 죄송합니다","Serious situations"], phrases:[{ko:"미안해",en:"Sorry (casual)",note:"Close friends/family"},{ko:"미안해요",en:"Sorry (polite)",note:"요=polite"},{ko:"정말 미안해",en:"I'm really sorry",note:"정말=really"}], bridgeNote:"'Mee-ahn-hay'. 미=me, 안=ahn (nasal ending), 해=hay.", dramaKo:"미안해... 내가 잘못했어.", dramaEn:'"I'm sorry... I was wrong."', show:{ko:"내 아이디는 강남미인",en:"My ID is Gangnam Beauty"}, insiderTip:"Two apology levels: 미안해 (casual, friends) and 죄송합니다 (formal, hierarchical). 미안해 to your boss is too casual.", memoryHook:"'Mee-ahn-hay' — 'me ahn hey' — a guilty wave.", level:0 },
  { id:"bogoshipo", word:"보고 싶어", roman:"bo-go si-peo", soundsLike:"boh-go shee-puh", english:"I miss you", emotion:"💙 longing", situation:"Long-distance, after a trip, after not seeing someone for a while", whenToUse:["Friends you haven't seen","Family far away","Romantic partner"], whenNOT:["Overly to strangers — sounds romantic"], phrases:[{ko:"보고 싶어",en:"I miss you",note:"Casual"},{ko:"너무 보고 싶어",en:"I miss you so much",note:"너무=so much"},{ko:"보고 싶었어",en:"I missed you (past)",note:"었어=past tense"}], bridgeNote:"'Boh-go shee-puh'. 보고=boh-go (want to see), 싶어=shee-puh (desire suffix).", dramaKo:"나 너무 보고 싶었어.", dramaEn:'"I missed you so much."', show:{ko:"도깨비",en:"Guardian: The Lonely and Great God"}, insiderTip:"보고 싶어 literally means 'I want to see you'. Korean expresses longing through the desire to see, not 'missing'. Beautiful.", memoryHook:"'Boh-go' = see. 'Shee-puh' = desire. Want to see you = miss you.", level:1 },
  // ── FOOD ─────────────────────────────────────────────────────
  { id:"masio", word:"맛있어", roman:"ma-si-sseo", soundsLike:"mah-shee-ssuh", english:"It's delicious!", emotion:"😋 delight", situation:"First bite of Korean food and your eyes light up", whenToUse:["Any time food is good","Highest compliment to a Korean cook"], whenNOT:["Never fake it — Koreans can tell"], phrases:[{ko:"맛있어!",en:"It's delicious!",note:"Casual"},{ko:"너무 맛있어",en:"So delicious",note:"너무=so much"},{ko:"진짜 맛있다",en:"Genuinely delicious",note:"진짜=genuinely"}], bridgeNote:"'Mah-shee-ssuh'. 맛=mah (taste), 있=shee (exist), 어=uh. 'Taste exists' = it's tasty.", dramaKo:"이거 진짜 맛있다!", dramaEn:'"This is genuinely so delicious!"', show:{ko:"식샤를 합시다",en:"Let's Eat"}, insiderTip:"맛있어 to a Korean cook is the most powerful compliment. Follow with 더 주세요 (more please) for full effect.", memoryHook:"'Mah-shee-ssuh' — mah she's awesome. Delicious!", level:0 },
  // ── SOCIAL ───────────────────────────────────────────────────
  { id:"chingu", word:"친구", roman:"chin-gu", soundsLike:"chin-goo", english:"Friend", emotion:"🤝 connection", situation:"Introducing or talking about a close friend of the same age", whenToUse:["Referring to same-age close friends"], whenNOT:["Older friends — use their title or 선배"], phrases:[{ko:"내 친구야",en:"This is my friend",note:"내=my"},{ko:"친구들이랑",en:"With friends",note:"들=plural"},{ko:"베프",en:"BFF",note:"Gen Z: 베스트 프렌드"}], bridgeNote:"'Chin-goo'. 친=chin (like chin), 구=goo. Equal stress on both syllables.", dramaKo:"야, 우리 친구잖아!", dramaEn:'"Hey, we're friends after all!"', show:{ko:"응답하라 1988",en:"Reply 1988"}, insiderTip:"Korean friendship is tied to age. 친구 = same-age strictly. 1 year difference changes vocabulary and dynamic completely.", memoryHook:"'Chin-goo' — chin-wag with a goo(d) friend.", level:0 },
  { id:"oppa", word:"오빠", roman:"op-pa", soundsLike:"op-pah", english:"Older brother / older male (female speaker)", emotion:"💕 affection", situation:"A female calling an older male friend, brother, or romantic interest", whenToUse:["Female → older male she's close with","Romantic contexts"], whenNOT:["Male speakers say 형 (hyung) instead"], phrases:[{ko:"오빠!",en:"(Hey) Oppa!",note:"Calling out"},{ko:"오빠가 할게",en:"Oppa will do it",note:"Referring to himself"},{ko:"오빠 보고 싶어",en:"I miss you, oppa",note:"Classic K-drama line"}], bridgeNote:"'Op-pah'. Double 'p' = aspirated. 오=oh, 빠=ppah (strong p).", dramaKo:"오빠, 나 무서워.", dramaEn:'"Oppa, I'm scared."', show:{ko:"상속자들",en:"The Heirs"}, insiderTip:"오빠 in K-pop is used romantically, but in real life it's purely age/family term. A female saying 오빠 doesn't automatically mean romance.", memoryHook:"'Op-pah' — operator brother. The one who helps.", level:1 },
];

const WEEKDAY_IDS = ["daebak", "hwaiting", "eomeo", "aigoo", "gwenchana", "bbal-li", "saranghae", "mianhae", "jinja", "masio", "chingu"];
const WEEKEND_IDS = ["wonsyat", "ya", "daebakida", "heol", "michweo", "bogoshipo", "oppa"];

const ONBOARD_Q = [
  { q: "When a K-drama character yells 대박 — you feel:", opts: [{ t: "Never heard it", v: 0 }, { t: "Heard it, fuzzy on meaning", v: 1 }, { t: "Know exactly when to use it", v: 2 }] },
  { q: "Watching K-drama without subtitles:", opts: [{ t: "Total mystery", v: 0 }, { t: "I catch a few words", v: 1 }, { t: "I follow the general story", v: 2 }] },
  { q: "Your Hangul reading:", opts: [{ t: "What's Hangul?", v: 0 }, { t: "I can sound it out slowly", v: 1 }, { t: "I read it even without knowing the word", v: 2 }] },
];

const COMMUNITY = [
  { emoji: "🛑", caption: "Found this at a Chicago crosswalk — what would Seoul streets actually say?", by: "@chicago_kdrama", time: "2h", replies: [{ who: "민지 🇰🇷 Native", text: "Seoul crosswalk buttons say '길을 건너세요' (cross the road) when safe! Same idea, totally different phrase 😄", hearts: 312 }, { who: "서현 🇰🇷 Native", text: "We also show '남은 시간' (time remaining) on countdown — Koreans love countdown timers 😂", hearts: 89 }] },
  { emoji: "🧋", caption: "Boba cup says 'shake well' — what's the Seoul cafe version?", by: "@nyc_bobafan", time: "5h", replies: [{ who: "준호 🇰🇷 Native", text: "잘 흔들어 주세요 — you'll actually see this EXACT phrase in Korea! 잘=well, 흔들어=shake, 주세요=please 😊", hearts: 441 }] },
  { emoji: "🏋️", caption: "Gym rules sign — what do Korean gyms put on theirs?", by: "@la_gymrat", time: "1d", replies: [] },
];

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════
function cn(...a: (string | boolean | undefined | null)[]) { return a.filter(Boolean).join(" "); }
function shuffle<T>(arr: T[]): T[] { return [...arr].sort(() => Math.random() - 0.5); }
function gw(id: string) { return ALL_WORDS.find(w => w.id === id)!; }
function initSR(id: string) { return { id, interval: 1, ease: 2.0, reps: 0, nextDue: Date.now() }; }

type Word = typeof ALL_WORDS[0];
type SR = { id: string; interval: number; ease: number; reps: number; nextDue: number };

// ═══════════════════════════════════════════════════════════════
// UI PRIMITIVES
// ═══════════════════════════════════════════════════════════════
function PhoneShell({ children, tabBar }: { children: React.ReactNode; tabBar?: React.ReactNode }) {
  return (
    <div className="w-[340px] h-[680px] rounded-[2.8rem] bg-[#111] p-[7px] shadow-2xl mx-auto flex-shrink-0">
      <div className="w-full h-full rounded-[2.3rem] bg-[#F8F6F2] overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 flex flex-col relative">{children}</div>
        {tabBar}
      </div>
    </div>
  );
}

function TabBar({ screen, onNav }: { screen: string; onNav: (s: string) => void }) {
  const tabs = [
    { id: "home",      icon: <Home size={15} />,      label: "Home"    },
    { id: "bite",      icon: <BookOpen size={15} />,  label: "Bite"    },
    { id: "games",     icon: <Beer size={15} />,      label: "Games"   },
    { id: "scan",      icon: <Camera size={15} />,    label: "Scan"    },
    { id: "community", icon: <Users size={15} />,     label: "Natives" },
  ];
  return (
    <div className="flex-shrink-0 bg-white/90 backdrop-blur border-t border-black/6 px-1 py-2 flex justify-around">
      {tabs.map(t => {
        const active = screen === t.id || (screen === "review" && t.id === "bite");
        return (
          <button key={t.id} onClick={() => onNav(t.id)}
            className={cn("flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all",
              active ? "text-[#EF3E4A]" : "text-black/25")}>
            {t.icon}
            <span className="text-[9px] font-bold">{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function TopBar({ label, onBack, right }: { label: string; onBack?: () => void; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 pt-4 pb-2 flex-shrink-0">
      {onBack
        ? <button onClick={onBack} className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center"><ChevronLeft size={15} /></button>
        : <span className="text-[9px] tracking-[0.2em] font-bold text-black/25">{label}</span>}
      {right ?? (onBack ? <span className="text-[9px] tracking-[0.2em] font-bold text-black/25">{label}</span> : null)}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PRONUNCIATION BRIDGE
// ═══════════════════════════════════════════════════════════════
function PronuncBridge({ word, soundsLike, roman, bridgeNote }: { word: string; soundsLike: string; roman: string; bridgeNote: string }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <div className="bg-white rounded-2xl border-2 border-black/8 p-4 mb-3">
      <p className="text-[9px] font-bold text-black/25 tracking-wider mb-3">PRONUNCIATION BRIDGE</p>
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 bg-[#6246EA]/8 rounded-xl p-2.5 text-center">
          <p className="text-[9px] text-[#6246EA]/60 font-semibold mb-1">your brain hears</p>
          <p className="text-sm font-black text-[#6246EA]">"{soundsLike}"</p>
        </div>
        <div className="flex-col items-center flex">
          <div className="w-6 h-0.5 bg-gradient-to-r from-[#6246EA] to-[#EF3E4A] rounded-full" />
          <p className="text-[8px] text-black/15 mt-0.5">→</p>
        </div>
        <button onClick={() => { setRevealed(true); speakKorean(word); }}
          className={cn("flex-1 rounded-xl p-2.5 text-center transition-all", revealed ? "bg-[#EF3E4A]/8" : "bg-black/4 active:scale-95")}>
          <p className="text-[9px] text-[#EF3E4A]/60 font-semibold mb-1">real Korean</p>
          <p className={cn("text-sm font-black", revealed ? "text-[#EF3E4A]" : "text-black/15")}>{revealed ? word : "tap"}</p>
        </button>
        <SpeakBtn text={word} size={13} />
      </div>
      {revealed && (
        <>
          <p className="text-[11px] text-black/40 mb-2 border-t border-black/6 pt-2 leading-relaxed">{roman}</p>
          <p className="text-xs text-black/55 leading-relaxed">{bridgeNote}</p>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ACTIVE RECALL CARD
// ═══════════════════════════════════════════════════════════════
function RecallCard({ word, onRated }: { word: Word; onRated: (v: number) => void }) {
  const [flipped, setFlipped] = useState(false);
  const [rated, setRated] = useState(false);
  const ratings = [
    { v: 1, label: "Forgot",  bg: "bg-red-50 border-red-200 text-red-500" },
    { v: 2, label: "Hard",    bg: "bg-orange-50 border-orange-200 text-orange-500" },
    { v: 3, label: "Got it",  bg: "bg-teal-50 border-teal-200 text-teal-600" },
    { v: 4, label: "Easy ⚡", bg: "bg-green-50 border-green-200 text-green-600" },
  ];
  return (
    <div className="flex-1 flex flex-col px-4 pt-1">
      <div className="bg-[#6246EA]/8 rounded-xl px-3 py-2 mb-3 flex items-center gap-2">
        <Brain size={12} className="text-[#6246EA]" />
        <p className="text-[10px] font-bold text-[#6246EA]">Active Recall — try to remember before flipping</p>
      </div>
      <button onClick={() => { setFlipped(true); speakKorean(word.word); }}
        className="flex-1 bg-white border-2 border-black/8 rounded-3xl flex flex-col items-center justify-center mb-3 active:scale-[0.98] transition-all">
        {!flipped ? (
          <>
            <p className="text-[9px] font-bold text-black/25 mb-4">WHAT DOES THIS MEAN?</p>
            <p className="text-5xl font-black text-[#111] mb-2" style={{ fontFamily: "Georgia,serif" }}>{word.word}</p>
            <p className="text-xs text-black/30 mb-4">{word.roman}</p>
            <p className="text-[10px] text-[#6246EA] font-semibold">tap to reveal + hear →</p>
          </>
        ) : (
          <>
            <p className="text-[9px] font-bold text-[#EF3E4A] mb-2">ANSWER</p>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-3xl font-black text-[#111]" style={{ fontFamily: "Georgia,serif" }}>{word.word}</span>
              <SpeakBtn text={word.word} size={14} />
            </div>
            <p className="text-base font-bold text-[#EF3E4A] mb-3">{word.english}</p>
            <p className="text-xs text-black/40 text-center px-4">{word.situation}</p>
          </>
        )}
      </button>
      {flipped && !rated && (
        <div className="mb-3">
          <p className="text-[9px] font-bold text-black/25 text-center mb-2">HOW DID YOU DO?</p>
          <div className="grid grid-cols-4 gap-1.5">
            {ratings.map(r => (
              <button key={r.v} onClick={() => { setRated(true); setTimeout(() => onRated(r.v), 300); }}
                className={cn("py-2.5 rounded-xl border-2 text-[10px] font-black", r.bg)}>
                {r.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {rated && <p className="text-center text-xs font-bold text-teal-500 mb-3">✓ Saved to review schedule</p>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MICRO TEST
// ═══════════════════════════════════════════════════════════════
function MicroTest({ learnedIds, onDone }: { learnedIds: string[]; onDone: (s: number, t: number) => void }) {
  const learned = learnedIds.map(gw).filter(Boolean);
  const [qIdx, setQIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const questions = shuffle(learned).slice(0, Math.min(3, learned.length)).map(target => ({
    target, opts: shuffle([target, ...shuffle(learned.filter(w => w.id !== target.id)).slice(0, 3)])
  }));

  if (questions.length === 0) { onDone(0, 0); return null; }
  const q = questions[qIdx];

  function pick(opt: Word) {
    if (answered) return;
    setAnswered(opt.id);
    const correct = opt.id === q.target.id;
    speakKorean(correct ? "정답" : "아니요");
    if (correct) setScore(s => s + 1);
    setTimeout(() => {
      if (qIdx + 1 < questions.length) { setQIdx(i => i + 1); setAnswered(null); }
      else setDone(true);
    }, 900);
  }

  if (done) return (
    <div className="flex-1 flex flex-col items-center justify-center px-5 text-center">
      <div className="w-16 h-16 rounded-full bg-[#FFBE0B] flex items-center justify-center mb-4"><Trophy size={28} className="text-white" /></div>
      <p className="text-[9px] font-bold text-black/25 mb-1">MICRO TEST</p>
      <p className="text-3xl font-black text-[#111] mb-2">{score}/{questions.length}</p>
      <p className="text-xs text-black/40 mb-6">{score === questions.length ? "Perfect! 🚀" : score >= questions.length / 2 ? "Good — keep going" : "These need more reps"}</p>
      <button onClick={() => onDone(score, questions.length)} className="px-8 py-3 rounded-full bg-[#111] text-white font-black text-sm">Continue</button>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col px-4 pt-3">
      <div className="flex gap-1 mb-3">{questions.map((_, i) => <div key={i} className={cn("h-0.5 flex-1 rounded-full", i < qIdx ? "bg-[#FFBE0B]" : i === qIdx ? "bg-[#111]" : "bg-black/8")} />)}</div>
      <div className="bg-[#FFBE0B]/10 rounded-xl px-3 py-1.5 mb-3 flex items-center gap-1.5">
        <Zap size={11} className="text-[#FFBE0B]" /><p className="text-[9px] font-bold text-black/40">Micro Test — {qIdx + 1}/{questions.length}</p>
      </div>
      <div className="bg-[#111] rounded-3xl p-5 flex flex-col items-center mb-4">
        <p className="text-4xl font-black text-white mb-1" style={{ fontFamily: "Georgia,serif" }}>{q.target.word}</p>
        <p className="text-white/30 text-xs mb-2">{q.target.roman}</p>
        <SpeakBtn text={q.target.word} size={12} dark label="hear it" />
      </div>
      <p className="text-[9px] font-bold text-black/25 text-center mb-2">WHICH MEANING?</p>
      <div className="grid grid-cols-2 gap-2">
        {q.opts.map(opt => {
          const isTarget = opt.id === q.target.id, isThis = answered === opt.id, ans = answered !== null;
          return (
            <button key={opt.id} onClick={() => pick(opt)}
              className={cn("py-3 px-2 rounded-2xl border-2 text-xs font-bold text-center transition-all",
                ans && isTarget ? "border-teal-400 bg-teal-50 text-teal-600" :
                  ans && isThis && !isTarget ? "border-red-300 bg-red-50 text-red-500" :
                    "border-black/8 bg-white text-[#111]")}>
              {opt.english}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 369 GAME — interactive, working sound
// ═══════════════════════════════════════════════════════════════
function Game369({ onBack }: { onBack: () => void }) {
  const [count, setCount] = useState(1);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);
  const [over, setOver] = useState(false);

  const isClap = (n: number) => n % 3 === 0 || String(n).includes("3") || String(n).includes("6") || String(n).includes("9");
  const clap = isClap(count);

  function tap(action: "number" | "clap") {
    const correct = (action === "clap" && clap) || (action === "number" && !clap);
    if (correct) {
      speakKorean(clap ? "짝" : String(count) + "번");
      setFeedback({ msg: clap ? "👏 짝!" : "✓", ok: true });
      setScore(s => s + 1);
    } else {
      speakKorean("아이쿠");
      setFeedback({ msg: "원샷! 🍺", ok: false });
      const nl = lives - 1; setLives(nl);
      if (nl <= 0) { setOver(true); return; }
    }
    setTimeout(() => { setFeedback(null); setCount(c => c + 1); }, 600);
  }

  function reset() { setCount(1); setScore(0); setLives(3); setOver(false); setFeedback(null); }

  if (over) return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-5">
      <p className="text-5xl mb-3">🍺</p>
      <p className="text-xl font-black text-[#111] mb-1">원샷 x3!</p>
      <p className="text-sm text-black/40 mb-1">You reached {count - 1}</p>
      <p className="text-2xl font-black text-[#EF3E4A] mb-6">Score: {score}</p>
      <button onClick={reset} className="px-8 py-3 rounded-full bg-[#111] text-white font-black text-sm mb-2">Play again</button>
      <button onClick={onBack} className="text-xs text-black/25 font-semibold">← Back to games</button>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col px-4 pt-1">
      <div className="flex items-center justify-between mb-3">
        <button onClick={onBack} className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center"><ChevronLeft size={15} /></button>
        <span className="text-[9px] font-bold text-black/25 tracking-wider">삼육구 LIVE</span>
        <div className="flex gap-0.5 text-sm">{[...Array(3)].map((_, i) => <span key={i}>{i < lives ? "❤️" : "🤍"}</span>)}</div>
      </div>
      <div className="flex justify-between mb-3">
        <div className="bg-white border border-black/8 rounded-xl px-4 py-2 text-center min-w-[70px]">
          <p className="text-lg font-black text-[#111]">{score}</p><p className="text-[9px] text-black/25">score</p>
        </div>
        <div className={cn("rounded-2xl px-6 py-2 text-center transition-all duration-200", clap ? "bg-[#EF3E4A] scale-110 shadow-lg" : "bg-white border-2 border-black/8")}>
          <p className={cn("text-3xl font-black", clap ? "text-white" : "text-[#111]")}>{count}</p>
          <p className={cn("text-[9px] font-bold", clap ? "text-white/70" : "text-black/25")}>{clap ? "CLAP!" : "say it"}</p>
        </div>
        <div className="bg-white border border-black/8 rounded-xl px-4 py-2 text-center min-w-[70px]">
          <p className="text-lg font-black text-[#111]">{lives}</p><p className="text-[9px] text-black/25">lives</p>
        </div>
      </div>
      {feedback && (
        <div className={cn("rounded-2xl py-2.5 text-center text-lg font-black mb-3", feedback.ok ? "bg-teal-50 text-teal-600" : "bg-[#EF3E4A]/10 text-[#EF3E4A]")}>
          {feedback.msg}
        </div>
      )}
      <p className="text-[9px] text-black/30 text-center mb-3">3/6/9 multiples or numbers containing 3,6,9 → 👏 CLAP</p>
      <div className="flex gap-3 flex-1 pb-2">
        <button onClick={() => tap("number")} disabled={!!feedback}
          className="flex-1 rounded-3xl bg-white border-2 border-black/8 flex flex-col items-center justify-center active:scale-95 transition-all disabled:opacity-50">
          <span className="text-4xl font-black text-[#111] mb-1">{count}</span>
          <span className="text-[10px] font-bold text-black/30">Say number</span>
        </button>
        <button onClick={() => tap("clap")} disabled={!!feedback}
          className="flex-1 rounded-3xl bg-[#111] flex flex-col items-center justify-center active:scale-95 transition-all disabled:opacity-50">
          <span className="text-4xl mb-1">👏</span>
          <span className="text-[10px] font-bold text-white/40">Clap!</span>
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// BITE SCREEN — 5-phase educator flow
// Phase 0: Hear it first (auto-play) + situation
// Phase 1: Pronunciation bridge
// Phase 2: Phrases + hear each
// Phase 3: Cultural insight + drama line
// Phase 4: Active recall
// ═══════════════════════════════════════════════════════════════
function BiteScreen({ word, dayMode, onDone, onBack }: { word: Word; dayMode: string; onDone: (r: number) => void; onBack: () => void }) {
  const phases = ["Hear First", "Sound", "Phrases", "Culture", "Recall"];
  const [phase, setPhase] = useState(0);
  const [pIdx, setPIdx] = useState(0);
  const [pShown, setPShown] = useState(false);

  useEffect(() => {
    if (phase === 0) setTimeout(() => speakKorean(word.word), 600); // auto-play on enter
  }, [phase]);

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <TopBar label={`BITE · ${dayMode === "weekend" ? "PARTY" : "LIGHT"}`} onBack={onBack} />
      <div className="flex gap-0.5 px-4 mb-2 flex-shrink-0">
        {phases.map((_, i) => <div key={i} className={cn("h-0.5 flex-1 rounded-full", i < phase ? "bg-[#EF3E4A]" : i === phase ? "bg-[#111]" : "bg-black/8")} />)}
      </div>
      <div className="px-4 flex items-center gap-2 mb-3 flex-shrink-0">
        <span className="text-2xl font-black text-[#111]" style={{ fontFamily: "Georgia,serif" }}>{word.word}</span>
        <SpeakBtn text={word.word} size={13} />
        <span className="text-xs text-black/30">{word.roman}</span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4">

        {/* Phase 0: Hear First + Situation */}
        {phase === 0 && (
          <div className="flex flex-col gap-3">
            <div className="bg-[#111] rounded-2xl p-5">
              <p className="text-[9px] font-bold text-[#EF3E4A] mb-2">HEAR IT IN CONTEXT</p>
              <p className="text-white font-bold text-sm mb-1">"{word.dramaKo}"</p>
              <p className="text-white/35 text-xs mb-3">{word.dramaEn}</p>
              <div className="flex items-center justify-between">
                <p className="text-white/15 text-[9px]">{word.show.ko} ({word.show.en})</p>
                <SpeakBtn text={word.dramaKo} size={12} dark label="play line" />
              </div>
            </div>
            <div className="bg-white border-2 border-black/8 rounded-2xl p-4">
              <p className="text-[9px] font-bold text-black/25 mb-2">THE SITUATION</p>
              <p className="text-sm font-semibold text-[#111] mb-3">{word.situation}</p>
              <p className="text-[9px] font-bold text-black/25 mb-1">EMOTION</p>
              <p className="text-sm">{word.emotion}</p>
            </div>
            <div className="bg-white border-2 border-black/8 rounded-2xl p-4">
              <p className="text-[9px] font-bold text-[#2EC4B6] mb-2">USE WHEN</p>
              {word.whenToUse.map((t, i) => <p key={i} className="text-xs text-black/60 mb-1">✓ {t}</p>)}
              <p className="text-[9px] font-bold text-[#EF3E4A] mt-2 mb-1">DON'T USE WHEN</p>
              {word.whenNOT.map((t, i) => <p key={i} className="text-xs text-black/60 mb-1">✗ {t}</p>)}
            </div>
          </div>
        )}

        {/* Phase 1: Pronunciation */}
        {phase === 1 && (
          <PronuncBridge word={word.word} soundsLike={word.soundsLike} roman={word.roman} bridgeNote={word.bridgeNote} />
        )}

        {/* Phase 2: Phrase chunks with audio */}
        {phase === 2 && (
          <div className="flex flex-col gap-3">
            <div className="bg-amber-50 rounded-xl px-3 py-2 flex items-center gap-1.5">
              <Sparkles size={11} className="text-amber-600" />
              <p className="text-[9px] font-bold text-amber-700">Real phrases — not just the word alone</p>
            </div>
            {word.phrases.map((p, i) => (
              <div key={i} className="bg-white border-2 border-black/8 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-lg font-black text-[#111]">{p.ko}</span>
                  <SpeakBtn text={p.ko} size={13} />
                </div>
                <p className="text-sm text-[#EF3E4A] font-semibold mb-1">{p.en}</p>
                <p className="text-[10px] text-black/35">{p.note}</p>
              </div>
            ))}
          </div>
        )}

        {/* Phase 3: Cultural insight */}
        {phase === 3 && (
          <div className="flex flex-col gap-3">
            <div className="bg-[#6246EA]/8 rounded-2xl p-4">
              <p className="text-[9px] font-bold text-[#6246EA] mb-2">🇰🇷 KOREAN INSIDER TIP</p>
              <p className="text-sm text-[#111] leading-relaxed">{word.insiderTip}</p>
            </div>
            <div className="bg-white border-2 border-black/8 rounded-2xl p-4">
              <p className="text-[9px] font-bold text-black/25 mb-2">MEMORY HOOK</p>
              <p className="text-sm font-semibold text-[#111]">{word.memoryHook}</p>
            </div>
            <div className="bg-[#111] rounded-2xl p-4">
              <p className="text-[9px] font-bold text-[#EF3E4A] mb-2">SHADOWING — say it 3 times</p>
              <div className="flex items-center justify-between">
                <span className="text-white font-bold">"{word.dramaKo}"</span>
                <SpeakBtn text={word.dramaKo} size={12} dark label="listen" />
              </div>
              <p className="text-white/30 text-xs mt-2">Listen → pause → repeat. x3</p>
            </div>
          </div>
        )}

        {/* Phase 4: Active Recall */}
        {phase === 4 && <RecallCard word={word} onRated={onDone} />}

        {phase < 4 && phase !== 4 && (
          <button onClick={() => setPhase(p => p + 1)} className="w-full py-3 rounded-full bg-[#111] text-white font-black text-sm mt-3 mb-4">
            Next →
          </button>
        )}
        <div className="h-2" />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// HOME SCREEN
// ═══════════════════════════════════════════════════════════════
function HomeScreen({ level, streak, dayMode, setDayMode, srCards, biteCount, onNav }: any) {
  const ids = dayMode === "weekday" ? WEEKDAY_IDS : WEEKEND_IDS;
  const bite = gw(ids[0]);
  const dueCount = srCards.filter((c: SR) => c.nextDue <= Date.now()).length;
  const learnedCount = srCards.filter((c: SR) => c.reps > 0).length;
  return (
    <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
      <div className="px-4 pt-4 pb-2 flex items-center justify-between flex-shrink-0">
        <div>
          <p className="text-[9px] font-bold text-black/25 tracking-wider">{LEVELS[level]}</p>
          <h1 className="text-base font-black text-[#111]">What's your Bite today?</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onNav("settings")} className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center">
            <Settings size={13} className="text-black/40" />
          </button>
          <div className="flex items-center gap-1 bg-[#FFBE0B]/15 px-2.5 py-1.5 rounded-full">
            <Flame size={12} className="text-[#FFBE0B]" /><span className="text-sm font-black text-[#111]">{streak}</span>
          </div>
        </div>
      </div>
      <div className="px-4 flex gap-2 mb-3">
        <div className="flex-1 bg-white border border-black/6 rounded-xl px-2 py-2 text-center">
          <p className="text-base font-black text-[#111]">{learnedCount}</p><p className="text-[9px] text-black/25 font-semibold">learned</p>
        </div>
        <button onClick={() => onNav("review")} className={cn("flex-1 rounded-xl px-2 py-2 text-center border transition-all", dueCount > 0 ? "bg-[#EF3E4A] border-[#EF3E4A]" : "bg-white border-black/6")}>
          <p className={cn("text-base font-black", dueCount > 0 ? "text-white" : "text-[#111]")}>{dueCount}</p>
          <p className={cn("text-[9px] font-semibold", dueCount > 0 ? "text-white/70" : "text-black/25")}>due review</p>
        </button>
        <div className="flex-1 bg-white border border-black/6 rounded-xl px-2 py-2 text-center">
          <p className="text-base font-black text-[#111]">{biteCount}</p><p className="text-[9px] text-black/25 font-semibold">bites done</p>
        </div>
      </div>
      <div className="px-4 mb-3 flex gap-2">
        <button onClick={() => setDayMode("weekday")} className={cn("flex-1 py-2 rounded-full text-[10px] font-bold transition-all", dayMode === "weekday" ? "bg-[#111] text-white" : "bg-black/5 text-black/35")}>Weekday ☀️</button>
        <button onClick={() => setDayMode("weekend")} className={cn("flex-1 py-2 rounded-full text-[10px] font-bold transition-all", dayMode === "weekend" ? "bg-[#EF3E4A] text-white" : "bg-black/5 text-black/35")}>Weekend 🍺</button>
      </div>
      <div className="px-4 mb-3">
        <button onClick={() => onNav("bite")} className="w-full rounded-3xl bg-[#111] p-5 text-left relative overflow-hidden active:scale-[0.98] transition-all">
          <div className="text-8xl font-black text-white/5 absolute -right-3 -bottom-5 select-none" style={{ fontFamily: "Georgia,serif" }}>ㅋ</div>
          <p className="text-[9px] font-bold text-[#EF3E4A] tracking-wider mb-2">TODAY'S BITE · {LEVELS[level]}</p>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-black text-white" style={{ fontFamily: "Georgia,serif" }}>{bite.word}</span>
            <span className="text-white/25 text-xs">{bite.roman}</span>
          </div>
          <p className="text-white/45 text-sm mb-3">{bite.emotion} · {bite.english}</p>
          <div className="flex items-center gap-2">
            <span className="bg-[#EF3E4A] text-white text-[10px] font-black px-3 py-1.5 rounded-full flex items-center gap-1.5"><Play size={10} fill="white" />Start</span>
            <SpeakBtn text={bite.word} size={12} dark />
          </div>
        </button>
      </div>
      <div className="px-4">
        <button onClick={() => onNav("share")} className="w-full flex items-center justify-between bg-[#FFBE0B]/10 rounded-2xl px-4 py-3">
          <p className="text-sm font-black text-[#111]">🔥 {streak} day streak</p>
          <span className="text-xs font-bold text-[#EF3E4A] flex items-center gap-1"><Share2 size={11} />Share</span>
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// REMAINING SCREENS (Games, Scan, Community, Share, Settings, Review, Onboarding)
// ═══════════════════════════════════════════════════════════════

function GamesScreen({ onBack, on369 }: { onBack: () => void; on369: () => void }) {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <TopBar label="GROUP GAMES" onBack={onBack} />
      <div className="px-4 pb-4 flex flex-col gap-3">
        <p className="text-[10px] text-black/35">Real Korean party games. Teach a new word after each round.</p>
        <button onClick={on369} className="bg-[#EF3E4A] rounded-2xl p-4 text-left">
          <div className="flex items-center gap-3 mb-1"><span className="text-2xl">3️⃣6️⃣9️⃣</span><div><p className="text-white font-black text-sm">삼육구 (Sam-yuk-gu)</p><p className="text-white/60 text-[10px]">Interactive — tap to play now</p></div></div>
          <p className="text-white/70 text-xs mt-1">Clap on 3/6/9 multiples. Wrong = 원샷! 3 lives.</p>
        </button>
        {[{ icon: "🔤", name: "끝말잇기 (Word Relay)", desc: "Last syllable starts the next word. Loser buys the round." }, { icon: "🎤", name: "노래 릴레이 (Song Relay)", desc: "Sing 2 K-pop lines → next person continues from your last word." }, { icon: "🤫", name: "진실 게임 (Truth)", desc: "진실 (truth) or 거짓말 (lie). Wrong guess = 원샷." }].map((g, i) => (
          <div key={i} className="bg-white border-2 border-black/6 rounded-2xl p-4">
            <div className="flex items-start gap-3"><span className="text-2xl">{g.icon}</span><div><p className="text-sm font-black text-[#111] mb-1">{g.name}</p><p className="text-xs text-black/45">{g.desc}</p><span className="text-[9px] text-black/25 font-semibold mt-1 inline-block">Coming soon</span></div></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScanScreen({ onBack, onCommunity }: { onBack: () => void; onCommunity: () => void }) {
  const [picked, setPicked] = useState<any>(null);
  const samples = [
    { emoji: "🛑", label: "STOP sign", ko: "정지", note: "정지 (jeong-ji) — 정=stop, 지=remain. Seoul uses the same octagon shape." },
    { emoji: "🧋", label: "Shake well", ko: "잘 흔들어 주세요", note: "잘=well · 흔들어=shake · 주세요=please. Word-for-word match in Korean cafes." },
    { emoji: "🏋️", label: "No food/drink", ko: "음식물 반입 금지", note: "금지=prohibited. You'll see 금지 everywhere in Korea — very useful to know." },
  ];
  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <TopBar label="SCAN & LEARN" onBack={onBack} />
      {!picked ? (
        <div className="px-4 flex flex-col gap-3">
          <div className="rounded-3xl bg-[#111] h-28 flex flex-col items-center justify-center"><Camera size={22} className="text-white/20 mb-1" /><p className="text-white/20 text-[10px]">Real camera · v1.1</p></div>
          <button onClick={onCommunity} className="flex items-center justify-between bg-[#2EC4B6]/10 rounded-2xl px-4 py-3">
            <span className="text-sm font-bold text-[#111] flex items-center gap-2"><Users size={13} className="text-[#2EC4B6]" />Ask the Community</span><ChevronRight size={14} className="text-black/25" />
          </button>
          <p className="text-[9px] font-bold text-black/25">TRY A SAMPLE</p>
          {samples.map((s, i) => <button key={i} onClick={() => setPicked(s)} className="text-left bg-white border-2 border-black/6 rounded-2xl px-4 py-3 text-sm font-semibold text-[#111]">{s.emoji} {s.label}</button>)}
        </div>
      ) : (
        <div className="px-4 flex flex-col gap-3">
          <div className="bg-white border-2 border-black/6 rounded-2xl p-5">
            <p className="text-[9px] font-bold text-black/25 mb-3">{picked.emoji} {picked.label}</p>
            <div className="h-px bg-black/6 mb-3" />
            <p className="text-[9px] font-bold text-[#EF3E4A] mb-2">IN KOREAN</p>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl font-black text-[#111]">{picked.ko}</span>
              <SpeakBtn text={picked.ko} size={14} />
            </div>
            <p className="text-xs text-black/50 leading-relaxed">{picked.note}</p>
          </div>
          <button onClick={onCommunity} className="w-full py-3 rounded-full bg-[#EF3E4A] text-white font-black text-sm flex items-center justify-center gap-2"><Sparkles size={13} />Post · let natives react 🇰🇷</button>
          <button onClick={() => setPicked(null)} className="text-xs text-black/25 font-semibold text-center">← Back</button>
        </div>
      )}
    </div>
  );
}

function CommunityScreen({ onBack }: { onBack: () => void }) {
  const [hearted, setHearted] = useState<Record<string, boolean>>({});
  const [detail, setDetail] = useState<number | null>(null);
  if (detail !== null) {
    const post = COMMUNITY[detail];
    return (
      <div className="flex-1 min-h-0 flex flex-col">
        <TopBar label="POST" onBack={() => setDetail(null)} />
        <div className="px-4 pb-2 flex-shrink-0">
          <div className="bg-[#111] rounded-2xl p-4 flex items-start gap-3">
            <span className="text-3xl">{post.emoji}</span><div><p className="text-white text-sm">{post.caption}</p><p className="text-white/25 text-[9px] mt-1">{post.by} · {post.time}</p></div>
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-4 flex flex-col gap-2.5 pb-2">
          {post.replies.length === 0 && <div className="text-center mt-8"><p className="text-3xl mb-2">🎣</p><p className="text-sm font-bold text-[#111] mb-1">No replies yet</p><p className="text-xs text-black/30">Share to attract natives</p></div>}
          {post.replies.map((r, ri) => {
            const k = `${detail}-${ri}`;
            return <div key={ri} className="bg-white border-2 border-black/6 rounded-2xl px-4 py-3">
              <p className="text-[10px] font-black text-[#2EC4B6] mb-1">{r.who}</p>
              <p className="text-sm text-[#111] mb-2 leading-relaxed">{r.text}</p>
              <button onClick={() => setHearted(h => ({ ...h, [k]: !h[k] }))} className={cn("flex items-center gap-1 text-[10px] font-bold", hearted[k] ? "text-[#EF3E4A]" : "text-black/25")}>
                <Heart size={11} fill={hearted[k] ? "#EF3E4A" : "none"} /> {r.hearts + (hearted[k] ? 1 : 0)}
              </button>
            </div>;
          })}
        </div>
        <div className="px-4 py-3 border-t border-black/6 flex gap-2 flex-shrink-0">
          <div className="flex-1 bg-white border-2 border-black/8 rounded-full px-3 py-2 text-xs text-black/20">Add your guess...</div>
          <button className="w-9 h-9 rounded-full bg-[#111] flex items-center justify-center"><Mic size={13} className="text-white" /></button>
        </div>
      </div>
    );
  }
  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <TopBar label="COMMUNITY" onBack={onBack} />
      <p className="px-4 text-[9px] text-black/30 mb-3">Snap anything → natives reply with the Korean 🇰🇷</p>
      <div className="px-4 flex flex-col gap-2.5 pb-4">
        {COMMUNITY.map((post, i) => (
          <button key={i} onClick={() => setDetail(i)} className="text-left bg-white border-2 border-black/6 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <span className="text-3xl">{post.emoji}</span>
              <div><p className="text-sm font-semibold text-[#111] mb-2">{post.caption}</p>
                <div className="flex gap-3 text-[9px] text-black/25"><span className="flex items-center gap-1"><MessageCircle size={10} />{post.replies.length} replies</span><span>{post.by}</span></div>
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
    <div className="flex-1 min-h-0 overflow-y-auto">
      <TopBar label="SHARE" onBack={onBack} />
      <div className="px-4 flex flex-col gap-3 pb-4">
        <div className="rounded-3xl bg-[#111] p-6 relative overflow-hidden">
          <div className="text-8xl font-black text-white/4 absolute -right-3 -bottom-6 select-none" style={{ fontFamily: "Georgia,serif" }}>ㅋ</div>
          <p className="text-[9px] font-bold text-[#EF3E4A] tracking-widest mb-3">K-PLAY KOREAN</p>
          <div className="flex items-center gap-3 mb-1"><span className="text-5xl font-black text-white" style={{ fontFamily: "Georgia,serif" }}>{word.word}</span><SpeakBtn text={word.word} size={15} dark /></div>
          <p className="text-white/40 text-sm mb-1">{word.roman}</p><p className="text-white/25 text-sm mb-4">{word.english}</p>
          <div className="flex items-center gap-3"><div className="flex items-center gap-1.5 bg-[#FFBE0B]/20 px-3 py-1.5 rounded-full"><Flame size={11} className="text-[#FFBE0B]" /><span className="text-[#FFBE0B] text-xs font-black">{streak} days</span></div><span className="text-white/15 text-[10px]">{LEVELS[level]}</span></div>
        </div>
        <div className="bg-white border-2 border-black/6 rounded-2xl p-4">
          <p className="text-[9px] font-bold text-black/25 mb-2">TIKTOK CAPTION</p>
          <p className="text-xs text-[#111] leading-relaxed">Just learned "{word.word}" ({word.roman}) — means {word.english} 🔥 Day {streak} streak on K-Play Korean #LearnKorean #KDrama #KPlayKorean #Korean #fyp</p>
        </div>
        <button className="w-full py-3.5 rounded-full bg-[#111] text-white font-black text-sm flex items-center justify-center gap-2"><Share2 size={13} />Save for TikTok / Reels</button>
        <button onClick={() => setCopied(true)} className={cn("w-full py-3 rounded-full border-2 font-black text-sm", copied ? "border-teal-400/30 text-teal-500" : "border-black/8 text-black/35")}>{copied ? "✓ Copied!" : "Copy caption"}</button>
      </div>
    </div>
  );
}

function ReviewScreen({ dueCards, onRate, onDone }: any) {
  const [idx, setIdx] = useState(0);
  if (dueCards.length === 0) return (
    <div className="flex-1 flex flex-col items-center justify-center px-5 text-center">
      <Clock size={32} className="text-black/15 mb-3" /><p className="font-black text-[#111] mb-1">All caught up!</p>
      <p className="text-xs text-black/35 mb-6">Come back later.</p>
      <button onClick={onDone} className="px-8 py-3 rounded-full bg-[#111] text-white font-black text-sm">Back</button>
    </div>
  );
  const word = gw(dueCards[idx]);
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="px-4 pt-4 pb-1 flex items-center justify-between flex-shrink-0">
        <span className="text-[9px] font-bold text-black/25 tracking-wider">REVIEW · {idx + 1}/{dueCards.length}</span>
        <button onClick={onDone} className="text-xs text-black/25 font-semibold">Skip</button>
      </div>
      <RecallCard word={word} onRated={r => { onRate(word.id, r); if (idx + 1 < dueCards.length) setIdx(i => i + 1); else onDone(); }} />
    </div>
  );
}

function OnboardScreen({ onDone }: { onDone: (lvl: number) => void }) {
  const [step, setStep] = useState(0); const [score, setScore] = useState(0);
  function pick(v: number) { const ns = score + v; if (step < ONBOARD_Q.length - 1) { setScore(ns); setStep(s => s + 1); } else { onDone(ns <= 1 ? 0 : ns <= 3 ? 1 : 2); } }
  return (
    <div className="flex-1 flex flex-col px-5 pt-6">
      <div className="flex items-center justify-between mb-8"><span className="text-[9px] tracking-[0.2em] font-bold text-black/25">K-PLAY KOREAN</span><span className="text-2xl font-black text-[#EF3E4A]" style={{ fontFamily: "Georgia,serif" }}>ㅋ</span></div>
      <div className="flex gap-1.5 mb-8">{ONBOARD_Q.map((_, i) => <div key={i} className={cn("h-1 flex-1 rounded-full", i < step ? "bg-[#EF3E4A]" : i === step ? "bg-[#111]" : "bg-black/8")} />)}</div>
      <p className="text-[10px] font-bold text-black/30 mb-3">Quick check · {step + 1}/3</p>
      <h2 className="text-lg font-black text-[#111] mb-8 leading-snug">{ONBOARD_Q[step].q}</h2>
      <div className="flex flex-col gap-2.5">{ONBOARD_Q[step].opts.map((o, i) => <button key={i} onClick={() => pick(o.v)} className="text-left px-4 py-3.5 rounded-2xl border-2 border-black/8 bg-white text-[#111] font-semibold text-sm active:border-[#EF3E4A]">{o.t}</button>)}</div>
    </div>
  );
}

function LevelResult({ level, onContinue }: { level: number; onContinue: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
      <div className="w-20 h-20 rounded-full bg-[#EF3E4A] flex items-center justify-center mb-5 shadow-lg"><Check size={32} className="text-white" strokeWidth={3} /></div>
      <p className="text-[9px] font-bold text-black/25 tracking-wider mb-2">YOUR STARTING LEVEL</p>
      <h2 className="text-3xl font-black text-[#111] mb-6">{LEVELS[level]}</h2>
      <div className="flex flex-col gap-2 mb-8 w-full">
        {[["🎧", "Hear it first — audio plays automatically"], ["🌉", "Sound bridge from English → Korean"], ["🇰🇷", "Cultural insider tips, not just translation"], ["🧠", "Active recall + spaced repetition"], ["⚡", "Micro test every 3 bites"]].map(([icon, text]) => (
          <div key={text as string} className="flex items-center gap-2 bg-black/4 rounded-xl px-3 py-2"><span>{icon}</span><p className="text-xs text-black/50 font-semibold">{text}</p></div>
        ))}
      </div>
      <button onClick={onContinue} className="px-10 py-3.5 rounded-full bg-[#111] text-white font-black text-sm flex items-center gap-2">Let's play <ArrowRight size={14} /></button>
    </div>
  );
}

function SettingsScreen({ level, setLevel, onBack }: any) {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <TopBar label="SETTINGS" onBack={onBack} right={<button onClick={onBack} className="text-[11px] font-bold text-[#EF3E4A]">Done</button>} />
      <div className="px-4">
        <p className="text-sm font-black text-[#111] mb-1">Your level</p>
        <p className="text-xs text-black/30 mb-4">Change anytime — content updates immediately</p>
        <div className="flex flex-col gap-2">{LEVELS.map((lbl, i) => <button key={lbl} onClick={() => setLevel(i)} className={cn("flex items-center justify-between px-4 py-3 rounded-2xl border-2 text-sm font-bold", i === level ? "border-[#EF3E4A] bg-[#EF3E4A]/6 text-[#111]" : "border-black/8 bg-white text-black/30")}>{lbl}{i === level && <Check size={14} className="text-[#EF3E4A]" />}</button>)}</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ROOT APP
// ═══════════════════════════════════════════════════════════════
function SplashScreen({ onDone }: { onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 1800); return () => clearTimeout(t); }, []);
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-[#111] rounded-[2.3rem]">
      <div className="text-8xl font-black text-white mb-2" style={{ fontFamily: "Georgia,serif" }}>ㅋ</div>
      <p className="text-white text-xl font-black">K-Play Korean</p>
      <p className="text-white/30 text-xs mt-1">for real life, not textbooks</p>
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState("splash");
  const [level, setLevel] = useState(1);
  const [dayMode, setDayMode] = useState("weekday");
  const [streak] = useState(12);
  const [biteCount, setBiteCount] = useState(0);
  const [showMicro, setShowMicro] = useState(false);
  const [playing369, setPlaying369] = useState(false);
  const [srCards, setSrCards] = useState<SR[]>(ALL_WORDS.map(w => initSR(w.id)));

  // Daily rotation — different word each day based on day-of-year
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(),0,0).getTime()) / 86400000);
  const currentIds = dayMode === "weekday" ? WEEKDAY_IDS : WEEKEND_IDS;
  const currentWord = gw(currentIds[dayOfYear % currentIds.length]);
  const learnedIds = srCards.filter(c => c.reps > 0).map(c => c.id);
  const dueCards = srCards.filter(c => c.nextDue <= Date.now()).map(c => c.id);

  function handleRate(wordId: string, rating: number) {
    setSrCards(prev => prev.map(c => {
      if (c.id !== wordId) return c;
      const { interval, ease } = calcNext(c.interval, c.ease, rating);
      return { ...c, interval, ease, reps: c.reps + 1, nextDue: Date.now() + interval * 60 * 1000 };
    }));
  }

  function handleBiteDone(rating: number) {
    handleRate(currentWord.id, rating);
    const nc = biteCount + 1; setBiteCount(nc);
    if (nc % 3 === 0 && learnedIds.length >= 2) setShowMicro(true);
    else setScreen("share");
  }

  const nav = (s: string) => { setPlaying369(false); setScreen(s); };
  const mainScreens = ["home", "bite", "games", "scan", "community"];
  const showTab = mainScreens.includes(screen) && !showMicro;

  const tabBar = showTab ? <TabBar screen={screen} onNav={nav} /> : undefined;

  if (screen === "splash") return <div className="min-h-screen bg-[#EDE9E3] flex items-center justify-center"><PhoneShell><SplashScreen onDone={() => nav("onboarding")} /></PhoneShell></div>;
  if (screen === "onboarding") return <div className="min-h-screen bg-[#EDE9E3] flex items-center justify-center"><PhoneShell><OnboardScreen onDone={lvl => { setLevel(lvl); nav("level-result"); }} /></PhoneShell></div>;
  if (screen === "level-result") return <div className="min-h-screen bg-[#EDE9E3] flex items-center justify-center"><PhoneShell><LevelResult level={level} onContinue={() => nav("home")} /></PhoneShell></div>;

  return (
    <div className="min-h-screen bg-[#EDE9E3] flex flex-col items-center justify-center py-6 px-4">
      <div className="mb-3 text-center">
        <p className="text-[9px] tracking-[0.25em] font-bold text-black/25">K-PLAY KOREAN · 한국어 배우기</p>
      </div>
      <PhoneShell tabBar={tabBar}>
        {screen === "home"      && <HomeScreen level={level} streak={streak} dayMode={dayMode} setDayMode={setDayMode} srCards={srCards} biteCount={biteCount} onNav={nav} />}
        {screen === "bite"      && <BiteScreen word={currentWord} dayMode={dayMode} onDone={handleBiteDone} onBack={() => nav("home")} />}
        {screen === "review"    && <ReviewScreen dueCards={dueCards} onRate={handleRate} onDone={() => nav("home")} />}
        {screen === "games"     && !playing369 && <GamesScreen onBack={() => nav("home")} on369={() => setPlaying369(true)} />}
        {screen === "games"     && playing369  && <Game369 onBack={() => setPlaying369(false)} />}
        {screen === "scan"      && <ScanScreen onBack={() => nav("home")} onCommunity={() => nav("community")} />}
        {screen === "community" && <CommunityScreen onBack={() => nav("home")} />}
        {screen === "share"     && <ShareScreen word={currentWord} level={level} streak={streak} onBack={() => nav("home")} />}
        {screen === "settings"  && <SettingsScreen level={level} setLevel={setLevel} onBack={() => nav("home")} />}
        {showMicro && (
          <div className="absolute inset-0 bg-[#F8F6F2] flex flex-col z-50">
            <div className="px-4 pt-4 pb-1 flex items-center justify-between flex-shrink-0">
              <span className="text-[9px] font-bold text-black/25 tracking-wider">⚡ MICRO TEST</span>
              <button onClick={() => { setShowMicro(false); nav("share"); }} className="text-xs text-black/25 font-semibold">Skip</button>
            </div>
            <MicroTest learnedIds={learnedIds} onDone={() => { setShowMicro(false); nav("share"); }} />
          </div>
        )}
      </PhoneShell>
    </div>
  );
}
