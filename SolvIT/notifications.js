/* notifications.js — @etiket bildirişi (demo) */

async function notifyUser(tagName, problem){
  // tagName: "@Nigar" kimi gəlir → adı çıxarırıq
  const clean = tagName.replace(/^@/,"").toLowerCase();
  const user = Store.users().find(u => u.fullName.toLowerCase().includes(clean));
  const title = "SolvIT • Yeni etiket";
  const body = `${problem.author} sizi etiketlədi: “${problem.text.slice(0,60)}...”`;

  if ("Notification" in window) {
    const perm = await Notification.requestPermission();
    if (perm === "granted") new Notification(title, { body });
    else alert(`${title}\n\n${body}`);
  } else {
    alert(`${title}\n\n${body}`);
  }

  // gələcəkdə: buradan real backend çağırışı etmək olar
}
