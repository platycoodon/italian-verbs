// ============================================================
// 应用逻辑 — 双视图：练习 / 错题本
// ============================================================

// --- 状态 ---
let state = {
  currentQuestion: null,
  totalAttempts: 0,
  correctCount: 0,
  mode: "normal",        // "normal" | "redo"
  errorQueue: [],         // 重做队列
  currentRedoIndex: 0,
  answered: false,
  currentView: "practice" // "practice" | "errors"
};

const STORAGE_KEY = "italian_verb_errors";

// ============================================
// 本地存储
// ============================================

function loadErrors() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) { return []; }
}

function saveErrors(errors) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(errors));
}

function addErrorRecord(record) {
  const errors = loadErrors();
  record.timestamp = Date.now();
  errors.push(record);
  saveErrors(errors);
}

function clearErrors() {
  saveErrors([]);
  updateErrorBadge();
}

function removeErrorRecord(index) {
  const errors = loadErrors();
  if (index >= 0 && index < errors.length) {
    errors.splice(index, 1);
    saveErrors(errors);
    return true;
  }
  return false;
}

// ============================================
// 视图切换
// ============================================

function switchView(viewId) {
  state.currentView = viewId;

  // 切换 tab 按钮状态
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  document.querySelector(`.tab-btn[data-view="${viewId}"]`).classList.add("active");

  // 切换视图面板
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.getElementById(`view-${viewId}`).classList.add("active");

  // 统计栏只在练习视图显示
  document.getElementById("stats-bar").style.display = viewId === "practice" ? "flex" : "none";

  if (viewId === "errors") {
    refreshErrorView();
  }
}

// ============================================
// 答题核心逻辑
// ============================================

function enterRedoMode() {
  const errors = loadErrors();
  if (errors.length === 0) {
    alert("🎉 错题本为空！");
    return false;
  }
  state.mode = "redo";
  state.errorQueue = [...errors];
  state.currentRedoIndex = 0;
  state.totalAttempts = 0;
  state.correctCount = 0;
  state.answered = false;
  nextRedoQuestion();

  // 切到练习视图
  switchView("practice");
  return true;
}

function nextRedoQuestion() {
  if (state.currentRedoIndex >= state.errorQueue.length) {
    showRedoComplete();
    return;
  }

  const err = state.errorQueue[state.currentRedoIndex];
  const verb = findVerb(err.verbInfinitive);
  if (!verb) {
    state.currentRedoIndex++;
    nextRedoQuestion();
    return;
  }

  const person = PERSONS.find(p => p.id === err.personId);
  state.currentQuestion = {
    verb: verb,
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

function newQuestion(tenseFilter) {
  state.currentQuestion = generateQuestion(tenseFilter ? { tense: tenseFilter } : {});
  state.answered = false;
  renderQuestion();
}

function checkAnswer(userInput) {
  if (state.answered) return;
  if (!state.currentQuestion) return;

  const q = state.currentQuestion;
  const trimmed = userInput.trim().toLowerCase();
  const correct = q.answer.trim().toLowerCase();
  const isCorrect = trimmed === correct;

  state.totalAttempts++;
  state.answered = true;

  if (isCorrect) {
    state.correctCount++;
    showFeedback(true, q.answer);
    if (state.mode === "redo") {
      removeErrorRecord(q.errorIndex);
    }
  } else {
    showFeedback(false, q.answer, trimmed);
    if (state.mode !== "redo") {
      const record = {
        verbInfinitive: q.verb.i,
        tenseId: q.tenseId,
        tenseLabel: q.tenseLabel,
        personId: q.person.id,
        personLabel: q.person.label,
        gender: q.gender,
        userAnswer: trimmed,
        correctAnswer: q.answer
      };
      addErrorRecord(record);
    }
  }

  updateStats();
  updateErrorBadge();
}

function nextQuestion() {
  if (state.mode === "redo") {
    state.currentRedoIndex++;
    nextRedoQuestion();
  } else {
    const filter = getTenseFilter();
    newQuestion(filter);
  }
}

// ============================================
// 界面渲染 — 练习
// ============================================

function renderQuestion() {
  const q = state.currentQuestion;
  if (!q) return;

  const verbDisplay = document.getElementById("verb-display");
  const tenseDisplay = document.getElementById("tense-display");
  const promptLabel = document.getElementById("prompt-label");
  const answerInput = document.getElementById("answer-input");
  const submitBtn = document.getElementById("submit-btn");
  const nextBtn = document.getElementById("next-btn");
  const feedbackArea = document.getElementById("feedback");

  verbDisplay.textContent = q.verb.i;
  tenseDisplay.textContent = q.tenseLabel;

  let genderHint = "";
  if (q.tenseId === "passato_prossimo" && q.verb.a === "essere") {
    genderHint = q.gender === "f" ? " (f)" : " (m)";
  }
  promptLabel.textContent = q.person.label + genderHint;

  answerInput.value = "";
  answerInput.disabled = false;
  answerInput.focus();
  submitBtn.disabled = false;
  nextBtn.style.display = "none";
  feedbackArea.className = "feedback hidden";
  feedbackArea.textContent = "";

  // 标记模式标签
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
  const feedbackArea = document.getElementById("feedback");
  const answerInput = document.getElementById("answer-input");
  const submitBtn = document.getElementById("submit-btn");
  const nextBtn = document.getElementById("next-btn");

  answerInput.disabled = true;
  submitBtn.disabled = true;
  nextBtn.style.display = "inline-block";

  if (isCorrect) {
    feedbackArea.className = "feedback correct";
    feedbackArea.innerHTML = `<span class="icon-correct">✓</span> 正确！<br><strong>${correctAnswer}</strong>`;
  } else {
    feedbackArea.className = "feedback wrong";
    feedbackArea.innerHTML = `
      <span class="icon-wrong">✗</span> 错误<br>
      你的答案：<s>${userAnswer}</s><br>
      正确答案：<strong>${correctAnswer}</strong>
    `;
  }
}

function showRedoComplete() {
  const container = document.getElementById("question-area");
  container.innerHTML = `
    <div class="redo-complete">
      <h2>✓ 错题重做完成</h2>
      <p>你已完成所有错题的重做。</p>
      <div class="redo-stats">
        <span>答对 ${state.correctCount}/${state.totalAttempts}</span>
        <span>正确率 ${state.totalAttempts > 0 ? Math.round(state.correctCount/state.totalAttempts*100) : 0}%</span>
      </div>
      <button onclick="exitRedoMode()" class="btn btn-primary">返回普通练习</button>
    </div>
  `;
  state.mode = "normal";
  updateErrorBadge();
}

function exitRedoMode() {
  state.mode = "normal";
  state.errorQueue = [];
  state.currentRedoIndex = 0;

  // 重建 question-area DOM
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
    </div>
  `;
  newQuestion(getTenseFilter());
  updateStats();
  updateErrorBadge();
}

// ============================================
// 界面渲染 — 错题本
// ============================================

function refreshErrorView() {
  const errors = loadErrors();
  const container = document.getElementById("error-list");
  const countLabel = document.getElementById("error-count-label");

  countLabel.textContent = `共 ${errors.length} 题`;

  if (errors.length === 0) {
    container.innerHTML = '<div class="error-empty"><span class="big-icon">🎉</span>暂无错题</div>';
    return;
  }

  // 按时间倒序显示
  container.innerHTML = errors.slice().reverse().map((e, displayIdx) => {
    const realIdx = errors.length - 1 - displayIdx;
    const timeStr = formatTime(e.timestamp);
    const genderTag = e.gender === "f" ? " (f)" : e.gender === "m" ? " (m)" : "";
    return `
      <div class="error-item">
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
      </div>
    `;
  }).join("");
}

function formatTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  const pad = n => String(n).padStart(2, "0");
  return `${d.getMonth() + 1}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function redoOneFromErrorView(index) {
  const errors = loadErrors();
  const err = errors[index];
  if (!err) return;

  // 构造成重做队列（只有这一题）
  state.mode = "redo";
  state.errorQueue = [err];
  state.currentRedoIndex = 0;
  state.totalAttempts = 0;
  state.correctCount = 0;
  state.answered = false;

  const verb = findVerb(err.verbInfinitive);
  if (!verb) {
    alert("找不到这个动词");
    state.mode = "normal";
    return;
  }

  const person = PERSONS.find(p => p.id === err.personId);
  state.currentQuestion = {
    verb: verb,
    tenseId: err.tenseId,
    tenseLabel: err.tenseLabel,
    person: person,
    gender: err.gender || "m",
    answer: err.correctAnswer,
    errorIndex: 0,
    errorRecord: err
  };
  state.answered = false;

  // 切回练习视图渲染
  switchView("practice");
  renderQuestion();
  updateStats();
}

function redoAllFromErrorView() {
  enterRedoMode();
}

// ============================================
// 统计 & 徽章更新
// ============================================

function updateStats() {
  document.getElementById("total-count").textContent = state.totalAttempts;
  document.getElementById("correct-count").textContent = state.correctCount;
  const rate = state.totalAttempts > 0 ? Math.round(state.correctCount / state.totalAttempts * 100) : 0;
  document.getElementById("accuracy-rate").textContent = rate + "%";
}

function updateErrorBadge() {
  const count = loadErrors().length;
  const badge = document.getElementById("tab-error-count");
  if (badge) badge.textContent = count;
}

function getTenseFilter() {
  const select = document.getElementById("tense-filter");
  return select.value || null;
}

function onFilterChange() {
  if (state.mode === "normal" && state.currentView === "practice") {
    newQuestion(getTenseFilter());
  }
}

// ============================================
// 事件绑定 & 入口
// ============================================

function handleSubmit() {
  const input = document.getElementById("answer-input");
  checkAnswer(input.value);
}

function initApp() {
  // 键盘绑定
  document.addEventListener("keydown", function(e) {
    if (e.key === "Enter") {
      const submitBtn = document.getElementById("submit-btn");
      const nextBtn = document.getElementById("next-btn");
      if (!submitBtn.disabled) {
        handleSubmit();
      } else if (nextBtn.style.display !== "none") {
        nextQuestion();
      }
    }
  });

  // 初始状态
  newQuestion(null);
  updateStats();
  updateErrorBadge();
}
