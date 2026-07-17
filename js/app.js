// 应用逻辑 — 调后端 API，localStorage 兜底

import * as api from './api.js';

// ── 状态 ──
let state = {
  currentQuestion: null,
  totalAttempts: 0,
  correctCount: 0,
  mode: "normal",
  errorQueue: [],
  currentRedoIndex: 0,
  answered: false,
  currentView: "practice",
  loading: false,
  user: null
};

const STORAGE_KEY = "italian_verb_errors";

// ── localStorage 兜底（未登录时用）──
function loadLocalErrors() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; }
}
function saveLocalErrors(errors) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(errors));
}
function addLocalError(record) {
  const errors = loadLocalErrors();
  record.timestamp = Date.now();
  errors.push(record);
  saveLocalErrors(errors);
}
function removeLocalError(index) {
  const errors = loadLocalErrors();
  if (index >= 0 && index < errors.length) { errors.splice(index, 1); saveLocalErrors(errors); return true; }
  return false;
}
function clearLocalErrors() { saveLocalErrors([]); }

// ── 统一错误操作 ──
async function loadErrors() {
  if (api.isLoggedIn()) {
    try { return await api.getErrors(); } catch {}
  }
  return loadLocalErrors();
}

async function addErrorRecord(record) {
  if (api.isLoggedIn()) {
    try {
      const result = await api.addError(record);
      if (result) record.id = result.id;
      return;
    } catch {}
  }
  addLocalError(record);
}

async function removeErrorRecord(idOrIndex, isLocal) {
  if (!isLocal && api.isLoggedIn()) {
    try { await api.deleteError(idOrIndex); return true; } catch {}
  }
  return removeLocalError(idOrIndex);
}

async function clearAllErrors() {
  if (api.isLoggedIn()) { try { await api.clearAllErrors(); } catch {} }
  clearLocalErrors();
  updateErrorBadge();
}

// ── 视图切换 ──
function switchView(viewId) {
  state.currentView = viewId;
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  document.querySelector(`.tab-btn[data-view="${viewId}"]`).classList.add("active");
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.getElementById(`view-${viewId}`).classList.add("active");
  document.getElementById("stats-bar").style.display = viewId === "practice" ? "flex" : "none";
  if (viewId === "errors") refreshErrorView();
}
window.switchView = switchView;

// ── 重做 ──
async function enterRedoMode() {
  const errors = await loadErrors();
  if (errors.length === 0) { alert("🎉 错题本为空！"); return false; }
  state.mode = "redo";
  state.errorQueue = [...errors];
  state.currentRedoIndex = 0;
  state.totalAttempts = 0;
  state.correctCount = 0;
  state.answered = false;
  nextRedoQuestion();
  switchView("practice");
  return true;
}
window.enterRedoMode = enterRedoMode;

function nextRedoQuestion() {
  if (state.currentRedoIndex >= state.errorQueue.length) { showRedoComplete(); return; }
  const err = state.errorQueue[state.currentRedoIndex];
  const person = { id: err.personId, label: err.personLabel };
  state.currentQuestion = {
    verbInfinitive: err.verbInfinitive,
    tenseId: err.tenseId,
    tenseLabel: err.tenseLabel,
    person: person,
    gender: err.gender || "m",
    answer: err.correctAnswer,
    errorIndex: state.currentRedoIndex,
    errorRecord: err
  };
  state.answered = false;
  renderQuestion();
}

async function handleNewQuestion(tenseFilter, verbTypeFilter) {
  state.loading = true;
  setLoadingUI(true);
  try {
    const data = await api.getQuestion(tenseFilter || undefined, verbTypeFilter || 'all');
    state.currentQuestion = {
      verbInfinitive: data.verbInfinitive,
      tenseId: data.tenseId,
      tenseLabel: data.tenseLabel,
      person: data.person,
      gender: data.gender || "m",
      answer: data.answer
    };
    state.answered = false;
    renderQuestion();
  } catch (err) {
    document.getElementById("verb-display").textContent = "⚠️ 连接失败";
    document.getElementById("feedback").className = "feedback wrong";
    document.getElementById("feedback").innerHTML = `无法连接到服务器，请确保后端已启动。<br><small>${err.message}</small>`;
    document.getElementById("feedback").style.display = '';
    document.getElementById("submit-btn").disabled = true;
  }
  state.loading = false;
  setLoadingUI(false);
}

function setLoadingUI(loading) {
  const btn = document.getElementById("submit-btn");
  const input = document.getElementById("answer-input");
  if (loading) {
    if (btn) btn.disabled = true;
    if (input) input.disabled = true;
  }
}

async function checkAnswer(userInput) {
  if (state.answered || state.loading || !state.currentQuestion) return;
  const q = state.currentQuestion;
  if (q.verbInfinitive === "⚠️") return;

  state.totalAttempts++;
  state.answered = true;

  try {
    const result = await api.checkAnswer(q.verbInfinitive, q.tenseId, q.person.id, q.gender, userInput);
    const isCorrect = result.isCorrect;
    const correctAnswer = result.correctAnswer;

    if (isCorrect) {
      state.correctCount++;
      showFeedback(true, correctAnswer);
      if (state.mode === "redo") {
        if (q.errorRecord && q.errorRecord.id) {
          await removeErrorRecord(q.errorRecord.id, false);
        } else {
          removeLocalError(q.errorIndex);
        }
      }
    } else {
      showFeedback(false, correctAnswer, userInput.trim());
      if (state.mode !== "redo") {
        await addErrorRecord({
          verbInfinitive: q.verbInfinitive,
          tenseId: q.tenseId,
          tenseLabel: q.tenseLabel,
          personId: q.person.id,
          personLabel: q.person.label,
          gender: q.gender,
          userAnswer: userInput.trim().toLowerCase(),
          correctAnswer: correctAnswer
        });
      }
    }
  } catch (err) {
    showFeedback(false, q.answer, userInput.trim());
  }

  updateStats();
  updateErrorBadge();
}

function nextQuestion() {
  if (state.mode === "redo") {
    state.currentRedoIndex++;
    nextRedoQuestion();
  } else {
    handleNewQuestion(getTenseFilter(), getVerbTypeFilter());
  }
}
window.nextQuestion = nextQuestion;

// ── UI 渲染 ──
function renderQuestion() {
  const q = state.currentQuestion;
  if (!q) return;

  document.getElementById("verb-display").textContent = q.verbInfinitive;
  document.getElementById("tense-display").textContent = q.tenseLabel;

  let genderHint = "";
  if (q.tenseId === "passato_prossimo" && q.tenseId) {
    // 简单判断用 essere 的动词（后端会处理，前端只展示性别提示）
    genderHint = q.gender === "f" ? " (f)" : " (m)";
  }
  document.getElementById("prompt-label").textContent = q.person.label + genderHint;

  const input = document.getElementById("answer-input");
  input.value = ""; input.disabled = false; input.focus();
  document.getElementById("submit-btn").disabled = false;
  document.getElementById("next-btn").style.display = "none";
  document.getElementById("feedback").className = "feedback hidden";
  document.getElementById("feedback").textContent = "";

  const tag = document.getElementById("mode-tag");
  if (state.mode === "redo") {
    tag.textContent = `🔄 重做中 (${state.currentRedoIndex + 1}/${state.errorQueue.length})`;
    tag.className = "mode-tag redo";
  } else {
    tag.textContent = "📖 普通练习";
    tag.className = "mode-tag";
  }
}

function showFeedback(isCorrect, correctAnswer, userAnswer) {
  document.getElementById("answer-input").disabled = true;
  document.getElementById("submit-btn").disabled = true;
  document.getElementById("next-btn").style.display = "inline-block";

  const fb = document.getElementById("feedback");
  if (isCorrect) {
    fb.className = "feedback correct";
    fb.innerHTML = `✓ 正确！<br><strong>${correctAnswer}</strong>`;
  } else {
    fb.className = "feedback wrong";
    fb.innerHTML = `✗ 错误<br>你的答案：<s>${userAnswer}</s><br>正确答案：<strong>${correctAnswer}</strong>`;
  }
}

function showRedoComplete() {
  document.getElementById("question-area").innerHTML = `
    <div class="redo-complete">
      <h2>✓ 错题重做完成</h2>
      <p>你已完成所有错题的重做。</p>
      <div class="redo-stats">
        <span>答对 ${state.correctCount}/${state.totalAttempts}</span>
        <span>正确率 ${state.totalAttempts > 0 ? Math.round(state.correctCount/state.totalAttempts*100) : 0}%</span>
      </div>
      <button onclick="exitRedoMode()" class="btn btn-primary">返回普通练习</button>
    </div>`;
  state.mode = "normal";
  updateErrorBadge();
}

function exitRedoMode() {
  state.mode = "normal";
  state.errorQueue = [];
  state.currentRedoIndex = 0;
  rebuildQuestionDOM();
  handleNewQuestion(getTenseFilter(), getVerbTypeFilter());
  updateStats();
  updateErrorBadge();
}
window.exitRedoMode = exitRedoMode;

function rebuildQuestionDOM() {
  document.getElementById("question-area").innerHTML = `
    <div class="question-header">
      <span class="verb-display" id="verb-display"></span>
      <span class="tense-display" id="tense-display"></span>
    </div>
    <div class="question-body">
      <span class="prompt-label" id="prompt-label">—</span>
      <input type="text" id="answer-input" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="输入变位...">
      <div class="btn-group">
        <button id="submit-btn" class="btn btn-primary" onclick="handleSubmit()">提交</button>
        <button id="next-btn" class="btn btn-secondary" style="display:none" onclick="nextQuestion()">下一题 →</button>
      </div>
      <div id="feedback" class="feedback hidden"></div>
    </div>`;
}

// ── 错题本视图 ──
async function refreshErrorView() {
  const errors = await loadErrors();
  const container = document.getElementById("error-list");
  const countLabel = document.getElementById("error-count-label");
  countLabel.textContent = `共 ${errors.length} 题`;
  if (errors.length === 0) {
    container.innerHTML = '<div class="error-empty"><span class="big-icon">🎉</span>暂无错题</div>';
    return;
  }
  container.innerHTML = errors.slice().reverse().map((e, displayIdx) => {
    const realIdx = errors.length - 1 - displayIdx;
    const timeStr = e.timestamp ? new Date(e.timestamp).toLocaleString() : '';
    const genderTag = e.gender === "f" ? " (f)" : e.gender === "m" ? " (m)" : "";
    return `<div class="error-item">
      <div class="error-info">
        <div class="error-verb">
          <span class="error-verb-name">${e.verbInfinitive}</span>
          <span class="error-tag">${e.tenseLabel}</span>
          <span class="error-person-tag">${e.personLabel}${genderTag}</span>
        </div>
        <div class="error-attempt">
          <span class="error-wrong-ans">${e.userAnswer}</span>
          <span class="error-arrow-icon">→</span>
          <span class="error-right-ans">${e.correctAnswer}</span>
        </div>
        <div class="error-time">${timeStr}</div>
      </div>
      <button class="error-redo-btn" onclick="redoOneFromErrorView(${realIdx})">重做此题</button>
    </div>`;
  }).join("");
}
window.refreshErrorView = refreshErrorView;

function redoOneFromErrorView(index) {
  (async () => {
    const errors = await loadErrors();
    const err = errors[index];
    if (!err) return;

    state.mode = "redo";
    state.errorQueue = [err];
    state.currentRedoIndex = 0;
    state.totalAttempts = 0;
    state.correctCount = 0;
    state.answered = false;

    const person = { id: err.personId, label: err.personLabel };
    state.currentQuestion = {
      verbInfinitive: err.verbInfinitive,
      tenseId: err.tenseId,
      tenseLabel: err.tenseLabel,
      person: person,
      gender: err.gender || "m",
      answer: err.correctAnswer,
      errorIndex: 0,
      errorRecord: err
    };
    state.answered = false;
    switchView("practice");
    renderQuestion();
    updateStats();
  })();
}
window.redoOneFromErrorView = redoOneFromErrorView;

function redoAllFromErrorView() { enterRedoMode(); }
window.redoAllFromErrorView = redoAllFromErrorView;

// ── 统计 ──
function updateStats() {
  document.getElementById("total-count").textContent = state.totalAttempts;
  document.getElementById("correct-count").textContent = state.correctCount;
  const rate = state.totalAttempts > 0 ? Math.round(state.correctCount / state.totalAttempts * 100) : 0;
  document.getElementById("accuracy-rate").textContent = rate + "%";
}

async function updateErrorBadge() {
  const errors = await loadErrors();
  const badge = document.getElementById("tab-error-count");
  if (badge) badge.textContent = errors.length;
}

function getTenseFilter() {
  const select = document.getElementById("tense-filter");
  return select.value || null;
}

function getVerbTypeFilter() {
  const select = document.getElementById("verb-type-filter");
  return select ? select.value || "all" : "all";
}

function onFilterChange() {
  if (state.mode === "normal" && state.currentView === "practice") {
    handleNewQuestion(getTenseFilter(), getVerbTypeFilter());
  }
}
window.onFilterChange = onFilterChange;

// ── 入口 ──
function handleSubmit() {
  const input = document.getElementById("answer-input");
  checkAnswer(input.value);
}
window.handleSubmit = handleSubmit;

async function initApp() {
  document.addEventListener("keydown", function(e) {
    if (e.key === "Enter") {
      const submitBtn = document.getElementById("submit-btn");
      const nextBtn = document.getElementById("next-btn");
      if (!submitBtn.disabled) { handleSubmit(); }
      else if (nextBtn.style.display !== "none") { nextQuestion(); }
    }
  });

  updateErrorBadge();
  handleNewQuestion(null, getVerbTypeFilter());
  updateStats();
}

window.initApp = initApp;

// 模块脚本自动延迟到 DOM 就绪后执行
initApp();
