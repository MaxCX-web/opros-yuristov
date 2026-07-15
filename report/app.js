const unlockView = document.getElementById("unlock-view");
const reportView = document.getElementById("report-view");
const unlockForm = document.getElementById("unlock-form");
const passwordInput = document.getElementById("password");
const unlockError = document.getElementById("unlock-error");
const refreshButton = document.getElementById("refresh-button");
const lockButton = document.getElementById("lock-button");

let activePassword = "";

function base64ToBytes(value) {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function decryptReport(password, cacheBust = false) {
  const suffix = cacheBust ? `?t=${Date.now()}` : "";
  const response = await fetch(`data.enc${suffix}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Не удалось загрузить данные отчёта.");

  const encrypted = await response.json();
  const normalizedPassword = password.normalize("NFKC");
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(normalizedPassword),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: base64ToBytes(encrypted.salt),
      iterations: encrypted.iterations,
      hash: encrypted.hash
    },
    passwordKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );

  const plainBytes = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(encrypted.iv) },
    key,
    base64ToBytes(encrypted.ciphertext)
  );

  return JSON.parse(new TextDecoder().decode(plainBytes));
}

function confidenceLabel(level) {
  return {
    high: "Подтверждено",
    medium: "Требует проверки",
    low: "Наблюдение"
  }[level] || "Наблюдение";
}

function renderSummary(data) {
  document.getElementById("report-meta").textContent = `${data.meta.period} · ${data.meta.scope}`;
  document.getElementById("updated-at").textContent = `Обновлено: ${data.meta.updatedAt}`;

  const confidence = document.getElementById("overall-confidence");
  confidence.textContent = data.summary.confidence;
  confidence.className = `confidence confidence--${data.summary.confidenceLevel}`;

  const items = [
    ["Ответов", data.summary.responses],
    ["Юристов оценено", `${data.summary.evaluatedLawyers} из ${data.summary.totalLawyers}`],
    ["Средняя оценка", data.summary.average.toFixed(1).replace(".", ",")],
    ["Применимых оценок", data.summary.applicableRatings]
  ];

  document.getElementById("summary-grid").innerHTML = items.map(([label, value]) => `
    <div class="summary-item">
      <span>${label}</span>
      <strong>${value}</strong>
    </div>
  `).join("");

  document.getElementById("management-note").textContent = data.summary.managementNote;
}

function renderScores(data) {
  document.getElementById("score-table").innerHTML = data.lawyers.map((lawyer) => `
    <article class="lawyer-score">
      <div class="lawyer-score__name">
        <strong>${lawyer.name}</strong>
        <span>n=${lawyer.sample}</span>
      </div>
      <div class="lawyer-score__metrics">
        ${lawyer.metrics.map((metric) => {
          const value = metric.value;
          const bar = value === null ? "" : `<span class="metric-row__bar ${value < 7 ? "is-attention" : ""}" style="width:${value * 10}%"></span>`;
          return `
            <div class="metric-row">
              <span class="metric-row__label">${metric.label}</span>
              <span class="metric-row__track">${bar}</span>
              <span class="metric-row__value">${value === null ? "—" : value}</span>
            </div>
          `;
        }).join("")}
      </div>
      <div class="lawyer-score__average">${lawyer.average.toFixed(1).replace(".", ",")}</div>
    </article>
  `).join("");
}

function renderInsights(data) {
  document.getElementById("insights").innerHTML = data.insights.map((insight) => `
    <article class="insight">
      <div>
        <span class="confidence confidence--${insight.confidence}">${confidenceLabel(insight.confidence)}</span>
        <h3>${insight.title}</h3>
        <div class="insight__person">${insight.person}</div>
      </div>
      <ul>${insight.evidence.map((item) => `<li>${item}</li>`).join("")}</ul>
      <div class="insight__action"><strong>Следующий шаг:</strong> ${insight.nextStep}</div>
    </article>
  `).join("");

  document.getElementById("quality-note").innerHTML = `
    <strong>Контроль качества данных</strong>
    <ul>${data.quality.map((item) => `<li>${item}</li>`).join("")}</ul>
  `;
}

function renderActions(data) {
  document.getElementById("actions-body").innerHTML = data.actions.map((action) => `
    <tr>
      <td>${action.priority}</td>
      <td>${action.action}</td>
      <td>${action.status}</td>
      <td>${action.metric}</td>
    </tr>
  `).join("");
}

function renderReport(data) {
  renderSummary(data);
  renderScores(data);
  renderInsights(data);
  renderActions(data);
}

async function unlock(password) {
  unlockError.textContent = "";
  try {
    const data = await decryptReport(password);
    activePassword = password;
    renderReport(data);
    unlockView.classList.add("is-hidden");
    reportView.classList.remove("is-hidden");
    passwordInput.value = "";
  } catch (error) {
    unlockError.textContent = "Неверный пароль или данные отчёта повреждены.";
    passwordInput.select();
  }
}

unlockForm.addEventListener("submit", (event) => {
  event.preventDefault();
  unlock(passwordInput.value);
});

refreshButton.addEventListener("click", async () => {
  const status = document.getElementById("update-status");
  refreshButton.disabled = true;
  status.textContent = "Проверяем обновления…";
  try {
    const data = await decryptReport(activePassword, true);
    renderReport(data);
    status.textContent = "Загружена актуальная версия";
  } catch (error) {
    status.textContent = "Не удалось обновить данные";
  } finally {
    refreshButton.disabled = false;
  }
});

lockButton.addEventListener("click", () => {
  activePassword = "";
  reportView.classList.add("is-hidden");
  unlockView.classList.remove("is-hidden");
  unlockError.textContent = "";
  passwordInput.focus();
});
