const people = [
  {
    id: "mishukov",
    name: "Мишуков Сергей",
    initials: "МС",
    scope: "Совместные задачи и консультации",
    metrics: ["documents", "comfort", "completeness"]
  },
  {
    id: "filatova",
    name: "Филатова Наталья",
    initials: "ФН",
    scope: "Документы, совместные задачи и консультации",
    metrics: ["documents", "comfort", "completeness"]
  },
  {
    id: "mavricheva",
    name: "Мавричева Ирина",
    initials: "МИ",
    scope: "Документы, совместные задачи и консультации",
    metrics: ["documents", "comfort", "completeness"]
  }
];

const metricCopy = {
  documents: {
    title: "Качество подготовки документов",
    hint: "Точность, понятность и готовность к использованию"
  },
  comfort: {
    title: "Комфорт совместной работы",
    hint: "Коммуникация, включённость и уважение к ролям"
  },
  completeness: {
    title: "Полнота результата",
    hint: "Насколько исчерпывающим был ответ или решение"
  }
};

const googleFields = {
  documents: {
    mishukov: "entry.1941643990",
    filatova: "entry.70135648",
    mavricheva: "entry.1279004608"
  },
  comfort: {
    mishukov: "entry.1725982862",
    filatova: "entry.76976019",
    mavricheva: "entry.932387424"
  },
  completeness: {
    mishukov: "entry.1832626591",
    filatova: "entry.650491837",
    mavricheva: "entry.1705584364"
  },
  comments: {
    documents: "entry.588539366",
    comfort: "entry.2101736683",
    completeness: "entry.1400028888",
    difficulties: "entry.67050432"
  }
};

const state = {
  selected: [],
  personIndex: 0,
  submitted: false
};

const peopleGrid = document.querySelector("#people-grid");
const surveyForm = document.querySelector("#survey-form");
const personStep = document.querySelector('[data-step="person"]');
const finalStep = document.querySelector('[data-step="final"]');
const successStep = document.querySelector('[data-step="success"]');
const progressBar = document.querySelector("#progress-bar");
const stepNumber = document.querySelector("#step-number");
const stepLabel = document.querySelector("#step-label");
const stepCount = document.querySelector("#step-count");
const selectionError = document.querySelector("#selection-error");
const difficultyWrap = document.querySelector("#difficulty-details-wrap");
const difficultyDetails = document.querySelector("#difficulty-details");
const submitButton = document.querySelector("#submit-button");

renderPeople();

document.querySelector("#start-button").addEventListener("click", startSurvey);
document.querySelectorAll('[data-action="back"]').forEach(button => button.addEventListener("click", goBack));
document.querySelectorAll('input[name="had-difficulty"]').forEach(input => input.addEventListener("change", toggleDifficulty));
surveyForm.addEventListener("submit", submitSurvey);
document.querySelector("#submit-frame").addEventListener("load", handleSubmitFrame);

function renderPeople() {
  peopleGrid.innerHTML = people.map(person => `
    <label class="person-choice">
      <input type="checkbox" name="person" value="${person.id}">
      <span class="avatar" aria-hidden="true">${person.initials}</span>
      <span class="person-choice__copy">
        <strong>${person.name}</strong>
        <span>${person.scope}</span>
      </span>
      <span class="person-choice__check" aria-hidden="true">✓</span>
    </label>
  `).join("");
}

function startSurvey() {
  state.selected = Array.from(document.querySelectorAll('input[name="person"]:checked')).map(input => input.value);
  if (!state.selected.length) {
    selectionError.textContent = "Выберите хотя бы одного коллегу.";
    return;
  }
  selectionError.textContent = "";
  state.personIndex = 0;
  renderPersonStep();
  showStep("person");
}

function renderPersonStep() {
  const person = getSelectedPeople()[state.personIndex];
  const metrics = person.metrics.map(metric => renderMetric(person, metric)).join("");
  const total = state.selected.length + 2;

  personStep.innerHTML = `
    <div class="step-heading">
      <p class="step-heading__kicker">Персональная оценка</p>
      <h2>${person.name}</h2>
      <p>Ориентируйтесь на опыт взаимодействия за последние 6 месяцев.</p>
    </div>
    <div class="person-summary">
      <span class="avatar" aria-hidden="true">${person.initials}</span>
      <div><strong>${person.name}</strong><span>${person.scope}</span></div>
    </div>
    ${metrics}
    <div class="field">
      <label for="positive-${person.id}">Что особенно помогло в совместной работе?</label>
      <textarea id="positive-${person.id}" data-comment="positive" data-person="${person.id}" rows="3" placeholder="Необязательно, но конкретный пример будет полезен"></textarea>
    </div>
    <div class="field is-hidden" id="improvement-wrap-${person.id}">
      <label for="improvement-${person.id}">Что можно улучшить? Приведите пример <span class="required">*</span></label>
      <textarea id="improvement-${person.id}" data-comment="improvement" data-person="${person.id}" rows="4" placeholder="Ситуация, её влияние и желаемый результат"></textarea>
      <p class="field-error" data-error-for="improvement-${person.id}" role="alert"></p>
    </div>
    <p class="field-error" id="person-error" role="alert"></p>
    <div class="actions">
      <button class="button button--secondary" type="button" id="person-back">Назад</button>
      <button class="button button--primary" type="button" id="person-next">
        ${state.personIndex === state.selected.length - 1 ? "К общим вопросам" : "Следующий коллега"}
        <span aria-hidden="true">→</span>
      </button>
    </div>
  `;

  restorePersonAnswers(person);
  personStep.querySelectorAll('input[type="radio"]').forEach(input => input.addEventListener("change", () => toggleImprovement(person)));
  personStep.querySelector("#person-back").addEventListener("click", goBack);
  personStep.querySelector("#person-next").addEventListener("click", nextPerson);
  updateMeta(state.personIndex + 2, total, person.name, `${Math.round(((state.personIndex + 1) / total) * 100)}%`);
}

function renderMetric(person, metric) {
  const copy = metricCopy[metric];
  return `
    <div class="metric" data-metric="${metric}">
      <div class="metric__title">
        <span class="metric__label">${copy.title}</span>
        <span>${copy.hint}</span>
      </div>
      <div class="rating" role="radiogroup" aria-label="${copy.title}: ${person.name}">
        ${Array.from({length: 10}, (_, index) => index + 1).map(value => `
          <label>
            <input type="radio" name="score-${person.id}-${metric}" value="${value}">
            <span>${value}</span>
          </label>
        `).join("")}
      </div>
      <div class="rating-scale"><span>Есть серьёзные сложности</span><span>Отлично</span></div>
    </div>
  `;
}

function savePersonAnswers(person) {
  person.metrics.forEach(metric => {
    const checked = personStep.querySelector(`input[name="score-${person.id}-${metric}"]:checked`);
    if (checked) sessionStorage.setItem(`score-${person.id}-${metric}`, checked.value);
  });
  ["positive", "improvement"].forEach(type => {
    const field = personStep.querySelector(`[data-comment="${type}"]`);
    sessionStorage.setItem(`${type}-${person.id}`, field.value.trim());
  });
}

function restorePersonAnswers(person) {
  person.metrics.forEach(metric => {
    const value = sessionStorage.getItem(`score-${person.id}-${metric}`);
    if (value) {
      const input = personStep.querySelector(`input[name="score-${person.id}-${metric}"][value="${value}"]`);
      if (input) input.checked = true;
    }
  });
  ["positive", "improvement"].forEach(type => {
    const field = personStep.querySelector(`[data-comment="${type}"]`);
    field.value = sessionStorage.getItem(`${type}-${person.id}`) || "";
  });
  toggleImprovement(person);
}

function toggleImprovement(person) {
  const scores = person.metrics.map(metric => {
    const input = personStep.querySelector(`input[name="score-${person.id}-${metric}"]:checked`);
    return input ? Number(input.value) : null;
  }).filter(value => value !== null);
  const needsDetail = scores.some(value => value <= 8);
  const wrap = personStep.querySelector(`#improvement-wrap-${person.id}`);
  wrap.classList.toggle("is-hidden", !needsDetail);
  return needsDetail;
}

function validatePerson(person) {
  const missing = person.metrics.some(metric => !personStep.querySelector(`input[name="score-${person.id}-${metric}"]:checked`));
  const error = personStep.querySelector("#person-error");
  if (missing) {
    error.textContent = "Поставьте оценку по каждому показателю.";
    return false;
  }
  error.textContent = "";

  if (toggleImprovement(person)) {
    const improvement = personStep.querySelector(`#improvement-${person.id}`);
    const improvementError = personStep.querySelector(`[data-error-for="improvement-${person.id}"]`);
    if (!improvement.value.trim()) {
      improvement.setAttribute("aria-invalid", "true");
      improvementError.textContent = "Расскажите, что именно можно улучшить.";
      improvement.focus();
      return false;
    }
    improvement.removeAttribute("aria-invalid");
    improvementError.textContent = "";
  }
  return true;
}

function nextPerson() {
  const person = getSelectedPeople()[state.personIndex];
  if (!validatePerson(person)) return;
  savePersonAnswers(person);
  if (state.personIndex < state.selected.length - 1) {
    state.personIndex += 1;
    renderPersonStep();
    window.scrollTo({top: 0, behavior: "smooth"});
    return;
  }
  showStep("final");
}

function goBack() {
  if (personStep.classList.contains("is-active")) {
    const person = getSelectedPeople()[state.personIndex];
    savePersonAnswers(person);
    if (state.personIndex > 0) {
      state.personIndex -= 1;
      renderPersonStep();
    } else {
      showStep("selection");
    }
    return;
  }
  if (finalStep.classList.contains("is-active")) {
    state.personIndex = state.selected.length - 1;
    renderPersonStep();
    showStep("person");
  }
}

function toggleDifficulty() {
  const selected = document.querySelector('input[name="had-difficulty"]:checked');
  const needsDetail = selected && selected.value === "Да";
  difficultyWrap.classList.toggle("is-hidden", !needsDetail);
  if (!needsDetail) {
    difficultyDetails.removeAttribute("aria-invalid");
    document.querySelector('[data-error-for="difficulty-details"]').textContent = "";
  }
}

function validateFinal() {
  const choice = document.querySelector('input[name="had-difficulty"]:checked');
  const finalError = document.querySelector("#final-error");
  if (!choice) {
    finalError.textContent = "Выберите один вариант ответа.";
    return false;
  }
  finalError.textContent = "";
  if (choice.value === "Да" && !difficultyDetails.value.trim()) {
    difficultyDetails.setAttribute("aria-invalid", "true");
    document.querySelector('[data-error-for="difficulty-details"]').textContent = "Опишите ситуацию, чтобы обратная связь была полезной.";
    difficultyDetails.focus();
    return false;
  }
  difficultyDetails.removeAttribute("aria-invalid");
  return true;
}

function submitSurvey(event) {
  event.preventDefault();
  if (!validateFinal()) return;

  const googleForm = document.querySelector("#google-form");
  googleForm.innerHTML = "";
  addRatingFields(googleForm);
  addCommentFields(googleForm);
  addHidden(googleForm, "fvv", "1");
  addHidden(googleForm, "pageHistory", "0");

  state.submitted = true;
  submitButton.disabled = true;
  submitButton.classList.add("is-loading");
  submitButton.querySelector(".button__label").textContent = "Отправляем";
  googleForm.submit();

  window.setTimeout(() => {
    if (state.submitted) showSuccess();
  }, 2200);
}

function addRatingFields(form) {
  people.forEach(person => {
    Object.entries(googleFields).forEach(([metric, mapping]) => {
      if (!["documents", "comfort", "completeness"].includes(metric)) return;
      const fieldName = mapping[person.id];
      if (!fieldName) return;
      const isSelected = state.selected.includes(person.id);
      const value = isSelected && person.metrics.includes(metric)
        ? sessionStorage.getItem(`score-${person.id}-${metric}`)
        : "не взаимодействую";
      addHidden(form, fieldName, value || "не взаимодействую");
    });
  });
}

function addCommentFields(form) {
  const comments = {documents: [], comfort: [], completeness: []};
  getSelectedPeople().forEach(person => {
    const positive = sessionStorage.getItem(`positive-${person.id}`) || "";
    const improvement = sessionStorage.getItem(`improvement-${person.id}`) || "";
    const lines = [];
    if (positive) lines.push(`Сильная сторона: ${positive}`);
    if (improvement) lines.push(`Можно улучшить: ${improvement}`);
    if (!lines.length) return;
    person.metrics.forEach(metric => comments[metric].push(`${person.name} — ${lines.join("; ")}`));
  });

  Object.entries(comments).forEach(([metric, lines]) => addHidden(form, googleFields.comments[metric], lines.join("\n")));

  const difficulty = document.querySelector('input[name="had-difficulty"]:checked').value;
  const wish = document.querySelector("#team-wish").value.trim();
  const parts = [`Сложности во взаимодействии: ${difficulty}.`];
  if (difficulty === "Да") parts.push(`Описание: ${difficultyDetails.value.trim()}`);
  if (wish) parts.push(`Общее предложение: ${wish}`);
  addHidden(form, googleFields.comments.difficulties, parts.join("\n"));
}

function addHidden(form, name, value) {
  const input = document.createElement("input");
  input.type = "hidden";
  input.name = name;
  input.value = value;
  form.appendChild(input);
}

function handleSubmitFrame() {
  if (state.submitted) showSuccess();
}

function showSuccess() {
  state.submitted = false;
  showStep("success");
  progressBar.style.width = "100%";
  updateMeta(state.selected.length + 2, state.selected.length + 2, "Готово", "100%");
  sessionStorage.clear();
}

function showStep(name) {
  document.querySelectorAll(".step").forEach(step => step.classList.remove("is-active"));
  document.querySelector(`[data-step="${name}"]`).classList.add("is-active");
  const total = Math.max(state.selected.length + 2, 2);
  if (name === "selection") updateMeta(1, total, "Выбор коллег", "12%");
  if (name === "final") updateMeta(total, total, "Общий опыт", "88%");
  window.scrollTo({top: 0, behavior: "smooth"});
}

function updateMeta(current, total, label, progress) {
  stepNumber.textContent = String(current).padStart(2, "0");
  stepLabel.textContent = label;
  stepCount.textContent = `Шаг ${current} из ${total}`;
  progressBar.style.width = progress;
}

function getSelectedPeople() {
  return state.selected.map(id => people.find(person => person.id === id));
}
