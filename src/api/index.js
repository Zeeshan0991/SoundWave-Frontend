import axios from "axios";

/* ─────────────────────────────────────────────
   AXIOS INSTANCE
───────────────────────────────────────────── */

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL ||
    "http://localhost:5000/api",
  timeout: 10000,
});

/* ─────────────────────────────────────────────
   ATTACH TOKEN
   ✅ HOTFIX: was "token" — must match AuthContext
   which stores under "soundwave_token"
───────────────────────────────────────────── */

const TOKEN_KEY = "soundwave_token";  // ← single source of truth

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/* ─────────────────────────────────────────────
   GLOBAL RESPONSE HANDLER
───────────────────────────────────────────── */

let isRedirecting = false;

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    if (status === 401) {
      // ✅ HOTFIX: clear same keys AuthContext uses
      localStorage.removeItem("soundwave_token");
      localStorage.removeItem("soundwave_user");

      if (
        !isRedirecting &&
        window.location.pathname !== "/auth" &&
        window.location.pathname !== "/"
      ) {
        isRedirecting = true;
        window.history.replaceState({}, "", "/auth");
        window.dispatchEvent(new PopStateEvent("popstate"));
        setTimeout(() => { isRedirecting = false; }, 2000);
      }
    }

    return Promise.reject(error);
  }
);

export default api;

/* ═══════════════════════════════════════════════════════════════
   DISPLAY NAME UTILITIES
   Single source of truth for user name resolution.

   Priority chain (Phase 10):
     1. user.displayName  — Google full name, first word extracted
                            e.g. "Muhammad Zeeshan" → "Muhammad"
     2. user.username     — cleaned + dictionary-matched first name
                            e.g. "zeeshanrock001" → "Zeeshan"
     3. user.email        — prefix cleaned + dictionary-matched
                            e.g. "zeeshanrock@gmail.com" → "Zeeshan"
     4. "User"            — absolute fallback

   Usage:
     import { getDisplayName, getAvatarLetter } from "../api";
═══════════════════════════════════════════════════════════════ */

const KNOWN_NAMES = [
  // 8+ letters
  "muhammad","abdullah","mubashir","mushtaq","shahzaib","shahrukh",
  "shehryar","zubaidah","khurshid","muzaffar","sulayman",
  // 7 letters
  "ibrahim","ismaeel","mustafa","zeeshan","hussain","khadija",
  "yasmine","william","michael","matthew","jessica","richard",
  "timothy","stephen","raymond","roberto","shirley","zachary",
  // 6 letters
  "fatima","hassan","haroon","khalid","waleed","ramzan","saleem",
  "mazhar","nabeel","tahira","daniel","oliver","joseph","joshua",
  "samuel","rachel","hannah","angela","ashley","nicole","morgan",
  "jordan","julian","carlos","thomas","steven","robert","martin",
  "nathan","andrew","sandra","sharon","mariam","samira","yasmin",
  "bilaal","adnan","sultan","yusuf","zainab",
  // 5 letters
  "ahmed","aisha","akbar","alexa","alice","aliya","amber","ameer",
  "amina","amjad","ammar","anwar","arham","aryan","asher","ayaan",
  "ayesha","azhar","babar","bilal","brian","caleb","chloe","chris",
  "clara","david","diana","dylan","elena","elias","emily","ethan",
  "faiza","farha","fawad","grace","hafsa","hamid","hamza","harry",
  "henry","imran","irfan","isaac","jacob","james","jason","jawad",
  "jesse","julia","kabir","karim","katie","kevin","laila","laura",
  "layla","leila","lewis","linda","logan","lucas","lucia","lydia",
  "malik","maria","mario","megan","mehak","mehar","miles","mirza",
  "molly","moosa","munir","nadia","naeem","naila","naina","nazia",
  "nihal","nisha","norah","noura","nurul","owais","pablo","priya",
  "qasim","rabia","rahul","rajan","rania","rayan","rehan","riley",
  "roman","rubab","rumi","ryan","saeed","safia","sajid","samir","sarah","seema",
  "shaan","shawn","simon","sofia","sonia","stacy","tahir","talha",
  "tania","tariq","tooba","tyler","usman","uzair","vicky","waqar",
  "warda","wendy","zafar","zahid","zahra","zara","zoya",
  // 4 letters
  "adam","adil","afia","afra","ahad","aida","aima","aiza","ajay",
  "ajwa","alaa","alan","alex","alia","amal","aman","amar","amir",
  "amra","anas","anna","anne","anum","aqsa","aria","arif","arwa",
  "asad","asif","asma","atif","ayan","ayaz","ayra","aziz","beth",
  "bill","brad","carl","chad","cole","dana","dave","dawn","dean",
  "demi","dina","diya","drew","dua","ella","elle","elsa","emma",
  "erik","erin","evan","ezra","fadi","faye","finn","fred","gary",
  "gina","hadi","hala","hana","hani","haya","hina","hira","huma",
  "iram","iris","isha","isla","ivan","jack","jade","jake","jean",
  "jeff","jill","joel","joey","john","jose","josh","juan","judy",
  "june","kara","karl","kate","kaya","kira","kyle","lana","lara",
  "lars","lena","leon","lexi","liam","lila","lina","lisa","lola",
  "lora","luca","lucy","luke","luna","lynn","maaz","maha","maia",
  "mali","mara","marc","mari","mark","maya","mena","mia","mike",
  "mila","mina","mira","mona","musa","nada","nael","nail","nana",
  "nara","naya","neil","nida","nila","nina","nora","nova","omar",
  "orla","owen","paul","pete","phil","pia","rana","rani","rauf",
  "ravi","raya","reem","reza","rhea","rida","rina","rita","riya",
  "rosa","rose","ross","ruba","rumi","ryan","saad","saba","safa",
  "sage","saki","sama","sami","sana","sara","saud","sean","seth",
  "shay","skye","taha","tala","tara","teri","tess","tia","tina",
  "toni","tony","tuba","tyra","umar","umer","vera","vita","wade",
  "wafa","wali","will","xena","yara","yash","yuki","yuna","zaid",
  "zain","zara","zena","ziad","zina","zola","zuha",
  // 3 letters
  "abi","ada","adi","afa","aia","aim","ain","aja","aki","ala","ali",
  "aly","ama","ami","amy","ana","ani","ann","ara","ari","art","asa",
  "ash","ata","ava","aya","ben","bob","dan","dee","eli","eve","fay",
  "gem","guy","ian","ida","ila","ima","ina","ira","ivy","jan","jay",
  "jen","jim","joe","jon","joy","kay","ken","kim","lea","lee","leo",
  "lia","lin","liu","liz","lou","lyn","mae","max","may","meg","mel",
  "mia","nan","ned","neo","nia","pat","raj","ram","ray","rob","rod",
  "ron","roy","sam","sia","sue","ted","tim","tom","una","val","van",
  "vic","vin","wes","zak","zoe",
].sort((a, b) => b.length - a.length);

function extractFirstName(raw) {
  if (!raw) return null;
  const prefix  = raw.split("@")[0];
  const segment = prefix.split(/[._\-+]/)[0];
  const clean   = segment.replace(/\d+$/, "").replace(/[^a-zA-Z]/g, "").toLowerCase();
  if (!clean) return null;
  for (const name of KNOWN_NAMES) {
    if (clean.startsWith(name)) {
      return name.charAt(0).toUpperCase() + name.slice(1);
    }
  }
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

/* ── Phase 10: extract first word from a full display name ──────
   "Muhammad Zeeshan" → "Muhammad"
   "  Zeeshan  "      → "Zeeshan"
   "MuhammadZeeshan"  → "Muhammadzeeshan" (single token, returned as-is)
   Strips non-alpha from the first word, min 2 chars.
─────────────────────────────────────────────────────────────────  */
function extractFirstWord(fullName) {
  if (!fullName?.trim()) return null;
  const first = fullName.trim().split(/\s+/)[0];
  const clean = first.replace(/[^a-zA-Z]/g, "");
  if (clean.length < 2) return null;
  return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
}

export function getDisplayName(user) {
  if (!user) return "User";

  // 1. Google display name — first word of the full name Google provides
  //    e.g. displayName: "Muhammad Zeeshan" → "Muhammad"
  if (user.displayName?.trim()) {
    const name = extractFirstWord(user.displayName);
    if (name) return name;
  }

  // 2. Username — dictionary-matched first name segment
  //    e.g. username: "zeeshanrock001" → "Zeeshan"
  if (user.username?.trim()) {
    const name = extractFirstName(user.username);
    if (name) return name;
  }

  // 3. Email prefix — same dictionary matching
  //    e.g. "zeeshanrock001@gmail.com" → "Zeeshan"
  if (user.email?.trim()) {
    const name = extractFirstName(user.email);
    if (name) return name;
  }

  // 4. Absolute fallback
  return "User";
}

export function getAvatarLetter(user) {
  return getDisplayName(user).charAt(0).toUpperCase();
}

export function getAvatarHue(user) {
  const name = getDisplayName(user);
  return [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
}

export async function getMoodPlaylist(mood) {
  const response = await api.get(`/mood/${encodeURIComponent(mood)}`);
  return response.data;
}

export async function getQueueContinuation(session) {
  // session = [{ title, genre, mood, language, category, artistName }]
  const response = await api.post("/mood/continuation", { session });
  return response.data;
  // returns { suggestions: Track[], fallback: boolean }
}