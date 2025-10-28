/* main.js — index.html üçün əsas məntiq */

const el = sel => document.querySelector(sel);
const els = sel => [...document.querySelectorAll(sel)];

const problemInput = el("#problemInput");
const addImageBtn  = el("#addImageBtn");
const imageInput   = el("#imageInput");
const sendBtn      = el("#sendBtn");
const listEl       = el("#list");
const tagArea      = el("#tagArea");

const loginBtn     = el("#loginBtn");
const registerBtn  = el("#registerBtn");
const logoutBtn    = el("#logoutBtn");
const helloText    = el("#helloText");
const avatar       = el("#avatar");

const authModal    = el("#authModal");
const authSave     = el("#authSave");
const authClose    = el("#authClose");
const fullNameInp  = el("#fullName");
const emailInp     = el("#email");

let attachedImageData = [];   // base64 şəkil
let activeFilter = "all";

/* ——— İlk yüklənmə ——— */
window.addEventListener("DOMContentLoaded", () => {
  initAuthUI();
  renderList();
});

function initAuthUI(){
  const user = Store.currentUser();
  if (user){
    helloText.textContent = `Salam, ${user.fullName.split(" ")[0]}`;
    avatar.textContent = user.fullName?.[0]?.toUpperCase() || "S";
    loginBtn.style.display = "none";
    registerBtn.style.display = "none";
    // profil ikonuna kliklə menyunu göstər/gizlət
avatar.onclick = () => {
  const menu = document.getElementById("profileMenu");
  menu.classList.toggle("hidden");
};

// səhifədə başqa yerə klikləyərkən menyunu bağla
document.addEventListener("click", (e) => {
  const menu = document.getElementById("profileMenu");
  if (!menu.contains(e.target) && e.target !== avatar) {
    menu.classList.add("hidden");
  }
});
  } else {
    helloText.textContent = "Salam, qonaq";
    avatar.textContent = "S";
    loginBtn.style.display = "";
    registerBtn.style.display = "";
    logoutBtn.style.display = "none";
    // ilk girişdə modalı göstər
    openModal();
  }
}

function openModal(){ authModal.style.display = "flex"; }
function closeModal(){ authModal.style.display = "none"; }

authClose.onclick = closeModal;
registerBtn.onclick = openModal;
loginBtn.onclick = openModal;

authSave.onclick = () => {
 const user = {
  id: uid(),
  fullName: fullNameInp.value.trim(),
  email: emailInp.value.trim(),
  role: document.getElementById("role").value, // yeni hissə
  createdAt: Date.now()
};

  if (!user.fullName || !user.email || !user.role){
  alert("Zəhmət olmasa bütün xanaları doldurun."); 
  return;
}

// sadə e-poçt yoxlaması
if (!user.email.endsWith("@karabakh.edu.az")) {
  alert("Yalnız universitet e-poçtu ilə qeydiyyat mümkündür (example@karabakh.edu.az)");
  return;
}

  Store.upsertUser(user);
  Store.setCurrentUser(user);
  closeModal();
  initAuthUI();
};

/* ——— Şəkil əlavə et ——— */
addImageBtn.onclick = () => imageInput.click();

imageInput.onchange = async (e) => {
  const files = [...e.target.files];
  if (files.length === 0) return;

  const container = document.getElementById("imagePreviewContainer");
  container.innerHTML = ""; // köhnələri təmizləyək
  attachedImageData = [];

  for (const file of files) {
    const dataUrl = await fileToBase64(file);
    attachedImageData.push(dataUrl);

    const img = document.createElement("img");
    img.src = dataUrl;
    container.appendChild(img);
  }
};


function fileToBase64(file){
  return new Promise((res,rej)=>{
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

/* ——— Yazmağa başlayanda etiket sahəsi açılsın ——— */
problemInput.addEventListener("input", () => {
  if (problemInput.value.trim().length > 0) tagArea.classList.remove("hidden");
  else tagArea.classList.add("hidden");
});

/* ——— Problem göndər ——— */
sendBtn.onclick = () => {
  const user = Store.currentUser();
  if (!user){ openModal(); return; }  // qeydiyyatsız olmaz

  const text = problemInput.value.trim();
  if (!text){ alert("Zəhmət olmasa problemi yazın."); return; }

  // mətndən @etiket-ləri çıxar
  const tags = (text.match(/@\p{L}+/gu) || []).slice(0,5);

  const problem = {
    id: uid(),
    text,
    image: attachedImageData,      // null və ya dataURL
    author: user.fullName,
    authorId: user.id,
    status: "unresolved",          // default: Həll olunmayıb
    createdAt: Date.now(),
    date: nowISO(),
    solution: null,                // {text, image, solverName, date}
    tags,
    keywords: extractKeywords(text)
  };
  document.getElementById("imagePreview").classList.add("hidden");
  document.getElementById("imagePreview").src = "";


  // DB-yə yaz
  Store.addProblem(problem);

  // etiketlənənlərə demo bildiriş
  tags.forEach(t => notifyUser(t, problem));

  // UI təmizlə
  problemInput.value = "";
  attachedImageData = [];
  imageInput.value = "";
  document.getElementById("imagePreviewContainer").innerHTML = "";
  tagArea.classList.add("hidden");

  renderList();
};

/* ——— Tablar/filtrlər ——— */
els(".tab").forEach(tab=>{
  tab.onclick = ()=>{
    els(".tab").forEach(t=>t.classList.remove("active"));
    tab.classList.add("active");
    activeFilter = tab.dataset.filter;
    renderList();
  }
});

/* ——— Siyahını çək ——— */
function renderList(){
  const arr = Store.problems();
  const {all, solved, unsolved, progress} = countByStatus(arr);

  el("#countAll").textContent = `(${all})`;
  el("#countSolved").textContent = `(${solved})`;
  el("#countProgress").textContent = `(${progress})`;
  el("#countUnsolved").textContent = `(${unsolved})`;

  let filtered = arr;
  if (activeFilter === "solved") filtered = arr.filter(p => p.status === "solved");
  if (activeFilter === "unsolved") filtered = arr.filter(p => p.status !== "solved" && p.status !== "progress");
  if (activeFilter === "progress") filtered = arr.filter(p => p.status === "progress");

  listEl.innerHTML = filtered.map(renderCard).join("");

  // Hər kart üçün event-ləri aktivləşdir
  filtered.forEach(p => bindCardEvents(p.id));
}


function countByStatus(arr){
  let all = arr.length, solved = 0, unsolved = 0, progress = 0;
  arr.forEach(p => {
    if (p.status === "solved") solved++;
    else if (p.status === "progress") progress++;
    else unsolved++;
  });
  return {all, solved, unsolved, progress};
}



/* ——— Kart HTML ——— */
function renderCard(p){
  const statusCls = p.status==="solved" ? "solved"
                  : p.status==="progress" ? "progress"
                  : p.status==="impossible" ? "impossible"
                  : "unresolved";

  // Bənzər problemlər (yalnız solved-lar)
  const similars = Store.problems()
    .filter(x => x.id!==p.id && x.status==="solved")
    .map(x => ({p:x, score: similarScore(p.text, x.text)}))
    .filter(x => x.score>0)
    .sort((a,b)=>b.score-a.score)
    .slice(0,3);

  return `
  <div class="card" id="p-${p.id}">
    <div class="card-header">
      <div>
        <div style="font-weight:600">${escapeHTML(p.text)}</div>
        <div class="meta">${fmtDate(p.date)}</div>
      </div>
      <select data-status="${p.id}" class="status ${statusCls}">
        ${statusOption("unresolved","Həll olunmayıb",p.status)}
        ${statusOption("progress","Prosesdədir",p.status)}
        ${statusOption("impossible","Həlli mümkün deyil",p.status)}
        ${statusOption("solved","Həll edildi",p.status)}
      </select>
    </div>

    ${Array.isArray(p.image) ? 
  p.image.map(src => `<img src="${src}" alt="problem">`).join("") :
  (p.image ? `<img src="${p.image}" alt="problem">` : "")
}


   ${p.solution ? renderSolution(p.solution) : `
  <button class="icon-btn" data-open-solve="${p.id}" style="width:100%;margin-top:10px">
    Həll et
  </button>
  <div class="solve-box" id="solve-box-${p.id}">
    <div style="font-weight:600;margin-bottom:6px">Həll təklif edin:</div>
    <textarea placeholder="Problemin həllini təsvir edin..." id="solve-text-${p.id}"></textarea>
    <div style="display:flex;gap:8px;align-items:center;margin-top:8px">
      <button class="icon-btn" data-solve-img="${p.id}">Şəkil əlavə et</button>
      <input type="file" class="hidden" id="solve-file-${p.id}" accept="image/*" multiple>
      <img id="preview-${p.id}" style="display:none;width:80px;height:auto;border-radius:8px;border:1px solid #ccc">
      <div style="flex:1"></div>
      <button class="icon-btn primary" data-save-solution="${p.id}">Yadda saxla</button>
    </div>
  </div>`}

    <div class="meta">Etiketlər: ${(p.tags||[]).join(", ") || "—"}</div>
    <div class="meta">Həll edən: ${p.solution?.solverName || "—"}</div>
  </div>`;
}

function statusOption(val,label,current){
  return `<option value="${val}" ${current===val?"selected":""}>${label}</option>`;
}

function renderSolution(sol){
  return `
    <div style="margin-top:12px;padding:12px;border-radius:12px;background:#E9F9EF">
      <div style="font-weight:600">Həll:</div>
      <div>${escapeHTML(sol.text)}</div>
     ${Array.isArray(sol.image) 
  ? sol.image.map(src => `<img src="${src}" alt="solution">`).join("") 
  : (sol.image ? `<img src="${sol.image}" alt="solution">` : "")
}

      <div class="small">Həll edən: ${sol.solverName} • ${fmtDate(sol.date)}</div>
    </div>`;
}

/* ——— Kart event-ləri ——— */
function bindCardEvents(id){
  // status dəyişimi
  const statusSel = document.querySelector(`[data-status="${id}"]`);
  statusSel.onchange = () => {
    Store.updateProblem(id, { status: statusSel.value });
    renderList(); // CSS class-lar yenilənsin
  };
  // "Həll et" düyməsinə kliklə həll bölməsini aç/qapa
const openBtn = document.querySelector(`[data-open-solve="${id}"]`);
if (openBtn) {
  openBtn.onclick = () => {
    const box = document.getElementById(`solve-box-${id}`);
    if (box.style.display === "none" || box.style.display === "") {
      box.style.display = "block";
      openBtn.textContent = "Bağla";
    } else {
      box.style.display = "none";
      openBtn.textContent = "Həll et";
    }
  };
}


  // həll şəkli seç
 const imgBtn = document.querySelector(`[data-solve-img="${id}"]`);
const fileInp = el(`#solve-file-${id}`);
const preview = el(`#preview-${id}`);

if (imgBtn) imgBtn.onclick = () => fileInp.click();

fileInp.onchange = async (e) => {
  const files = [...e.target.files];
  if (files.length === 0) return;

  const previewContainer = document.createElement("div");
  previewContainer.style.display = "flex";
  previewContainer.style.gap = "6px";
  previewContainer.style.marginTop = "6px";

  preview.replaceWith(previewContainer); // əvvəlki img-i əvəz et

  previewContainer.innerHTML = "";

  for (const file of files) {
    const dataUrl = await fileToBase64(file);
    const img = document.createElement("img");
    img.src = dataUrl;
    img.style.width = "70px";
    img.style.height = "70px";
    img.style.objectFit = "cover";
    img.style.borderRadius = "8px";
    previewContainer.appendChild(img);
  }
};



  // həll saxla
  const saveBtn = document.querySelector(`[data-save-solution="${id}"]`);
  if (saveBtn) saveBtn.onclick = async ()=>{
    const user = Store.currentUser();
    if (!user){ openModal(); return; }
    const textEl = el(`#solve-text-${id}`);
    const t = textEl.value.trim();
    let imgData = [];
if (fileInp.files?.length) {
  for (const file of fileInp.files) {
    const dataUrl = await fileToBase64(file);
    imgData.push(dataUrl);
  }
}

    if (!t){ alert("Həll mətni boş ola bilməz."); return; }

    Store.updateProblem(id, {
      status: "solved",
      solution: { text: t, image: imgData, solverName: user.fullName, date: nowISO() }
    });
    renderList();
  };

  // bənzər problemə klik
  els(`[data-open]`).forEach(a=>{
    a.onclick = ()=>{
      const targetId = a.getAttribute("data-open");
      // sadə: həmin kartın yanına scroll
      const target = el(`#p-${targetId}`);
      if (target) target.scrollIntoView({behavior:"smooth",block:"center"});
    };
  });
}

/* ——— Çıxış ——— */
logoutBtn.onclick = ()=>{
  Store.logout();
  initAuthUI();
};

/* ——— Köməkçi ——— */
function escapeHTML(s=""){
  return s.replace(/[&<>"']/g, m=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]));
}

