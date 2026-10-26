/* 论文卡片上的问答面板。
   后端就绪后把 ENDPOINT 指向 OpenClaw 服务器上的接口即可，
   请求：POST {paper, messages:[{role,content}]} → {reply}
   契约写在 server/paper_ask.py 里，两边要保持一致。 */

const ENDPOINT = "";

function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text) node.textContent = text;
  return node;
}

function say(log, role, text) {
  const turn = el("div", "turn " + role, text);
  log.appendChild(turn);
  log.scrollTop = log.scrollHeight;
  return turn;
}

async function ask(paper, messages) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paper, messages })
  });
  if (!res.ok) throw new Error("HTTP " + res.status);
  const data = await res.json();
  if (!data || typeof data.reply !== "string") throw new Error("bad payload");
  return data.reply;
}

document.querySelectorAll(".paper").forEach(function (card) {
  const id = card.dataset.paper;
  const button = card.querySelector(".paper-ask");
  const panel = card.querySelector(".chat");
  const log = card.querySelector(".chat-log");
  const form = card.querySelector(".chat-form");
  const input = form.querySelector("input");
  const submit = form.querySelector("button");
  const history = [];
  let wired = false;

  function open() {
    panel.hidden = false;
    button.setAttribute("aria-expanded", "true");
    if (!wired) {
      wired = true;
      if (ENDPOINT) {
        say(log, "sys", "我只读过摘要，细节拿不准的会直说。");
      } else {
        say(log, "sys", "问答接口还在接，先看上面的简介。");
        input.disabled = true;
        submit.disabled = true;
        input.placeholder = "等服务器接上就能问";
      }
    }
    if (!input.disabled) input.focus();
  }

  function close() {
    panel.hidden = true;
    button.setAttribute("aria-expanded", "false");
  }

  button.addEventListener("click", function () {
    if (panel.hidden) open(); else close();
  });

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    const q = input.value.trim();
    if (!q || !ENDPOINT) return;
    input.value = "";
    input.disabled = true;
    submit.disabled = true;
    say(log, "me", q);
    history.push({ role: "user", content: q });
    const pending = say(log, "fish pending", "……");
    try {
      const reply = await ask(id, history);
      history.push({ role: "assistant", content: reply });
      pending.classList.remove("pending");
      pending.textContent = reply;
    } catch (err) {
      pending.textContent = "没连上服务器，过一会儿再问。";
      pending.classList.remove("pending");
      pending.classList.add("sys");
      history.pop();
    } finally {
      log.scrollTop = log.scrollHeight;
      input.disabled = false;
      submit.disabled = false;
      input.focus();
    }
  });
});
