/* data.js — LocalStorage helper-ləri */

// İstifadəçilər və problemlər "solvit.users" və "solvit.problems" açarları altında saxlanır.

const Store = {
  _get(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  },
  _set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },

  currentUser() {
    return this._get("solvit.currentUser", null);
  },
  setCurrentUser(user) {
    this._set("solvit.currentUser", user);
  },
  logout() {
    localStorage.removeItem("solvit.currentUser");
  },

  users() {
    return this._get("solvit.users", []);
  },
  upsertUser(user) {
    const arr = this.users();
    const idx = arr.findIndex(u => u.email === user.email);
    if (idx >= 0) arr[idx] = user; else arr.push(user);
    this._set("solvit.users", arr);
  },

  problems() {
    // ən yeni əvvəl gəlsin
    return this._get("solvit.problems", []).sort((a,b)=>b.createdAt-a.createdAt);
  },
  addProblem(p) {
    const arr = this._get("solvit.problems", []);
    arr.push(p);
    this._set("solvit.problems", arr);
  },
  updateProblem(id, patch) {
    const arr = this._get("solvit.problems", []);
    const idx = arr.findIndex(x => x.id === id);
    if (idx >= 0) {
      arr[idx] = {...arr[idx], ...patch};
      this._set("solvit.problems", arr);
    }
  }
};

// Kiçik util-lər
const uid = () => Math.random().toString(36).slice(2,9);
function nowISO(){
  return new Date().toISOString();
}

const fmtDate = iso => iso.split("T")[0];

/* Açarsöz çıxarma (bənzərlik üçün) — çox sadə versiya */
function extractKeywords(text){
  return (text || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(w => w.length >= 3 && !["və","bir","üçün","ilə","olan","kimi","hansI","amma","bu","ki","də","da"].includes(w));
}

/* Sadə oxşarlıq: kəsişən açarsözlərin sayı */
function similarScore(aText,bText){
  const A = new Set(extractKeywords(aText));
  const B = new Set(extractKeywords(bText));
  let score = 0;
  A.forEach(w => { if (B.has(w)) score++; });
  return score;
}
