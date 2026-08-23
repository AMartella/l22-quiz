/**
 * Logica del Quiz Online (Modalità Simulazione o Singolo Argomento)
 */
(function () {
  // Mappatura visiva dei nomi degli argomenti
  const TOPIC_NAMES = {
    A: "Cultura generale",
    B: "Conoscenze di base di biologia, chimica, fisica, matematica",
    C: "Conoscenze di base di lingua inglese",
    D: "Capacità logiche",
    E: "Comprensione del testo",
  };

  // Configurazione dei requisiti per la simulazione completa
  const SIMULATION_REQUIREMENTS = {
    A: 20,
    B: 15,
    C: 10,
    D: 20,
    E: 15,
  };

  const TOTAL_DURATION_SECONDS = 2 * 60 * 60; // 2 ore per la simulazione completa

  let allQuestionsData = [];
  let selectedQuestions = [];
  let userAnswers = {}; // Mappa { questionId: "opzioneSelezionata" }
  let flaggedQuestions = new Set();
  let lastWrongAnswersData = [];
  let timerInterval = null;
  let remainingTime = TOTAL_DURATION_SECONDS;
  let isSingleTopicMode = false;

  // --- FUNZIONI DI UTILITÀ ---

  function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
  }

  // --- SELEZIONE DOMANDE ---

  function prepareQuestions(mode, topic = "", count = 15) {
    let result = [];

    if (mode === "simulation") {
      isSingleTopicMode = false;
      Object.keys(SIMULATION_REQUIREMENTS).forEach((arg) => {
        const countNeeded = SIMULATION_REQUIREMENTS[arg];
        const available = allQuestionsData.filter((q) => q.argomento === arg);

        if (available.length < countNeeded) {
          console.warn(
            `Attenzione: Per l'argomento "${TOPIC_NAMES[arg] || arg}" sono disponibili solo ${available.length} domande su ${countNeeded} richieste.`
          );
        }

        const shuffledArg = shuffle(available);
        result.push(...shuffledArg.slice(0, countNeeded));
      });
      remainingTime = TOTAL_DURATION_SECONDS;
    } else {
      isSingleTopicMode = true;
      const available = allQuestionsData.filter((q) => q.argomento === topic);
      const shuffledArg = shuffle(available);
      
      if (shuffledArg.length < count) {
        alert(`Attenzione: Per questo argomento sono disponibili solo ${shuffledArg.length} domande.`);
      }
      result = shuffledArg.slice(0, count);
      
      // Calcolo tempo stimato: ~1.5 minuti per domanda in modalità argomento singolo
      remainingTime = result.length * 90;
    }

    const finalQuestions = shuffle(result);

    return finalQuestions.map((q) => ({
      ...q,
      risposte: shuffle(q.risposte),
    }));
  }

  // --- INTERFACCIA E CONFIGURAZIONE INIZIALE ---

  function onModeChange() {
    const modeSelect = document.getElementById("quiz-mode");
    const topicGroup = document.getElementById("topic-select-group");
    const countGroup = document.getElementById("count-select-group");

    if (modeSelect.value === "topic") {
      topicGroup.style.display = "block";
      countGroup.style.display = "block";
    } else {
      topicGroup.style.display = "none";
      countGroup.style.display = "none";
    }
  }

  function startQuizFromConfig() {
    const mode = document.getElementById("quiz-mode").value;
    const topic = document.getElementById("topic-select").value;
    const count = parseInt(document.getElementById("count-select").value, 10);

    selectedQuestions = prepareQuestions(mode, topic, count);

    if (selectedQuestions.length === 0) {
      alert("Nessuna domanda disponibile per la configurazione scelta!");
      return;
    }

    // Pulisci lo stato precedente
    userAnswers = {};
    flaggedQuestions.clear();
    lastWrongAnswersData = [];

    // Mostra la sezione Quiz e nascondi il setup
    document.getElementById("config-section").style.display = "none";
    document.getElementById("quiz-section").style.display = "block";

    renderQuiz();
    startTimer();
  }

  // --- TIMER ---

  function startTimer() {
    const timerDisplay = document.getElementById("timer-display");
    if (timerDisplay) timerDisplay.textContent = formatTime(remainingTime);

    if (timerInterval) clearInterval(timerInterval);

    timerInterval = setInterval(() => {
      remainingTime--;

      if (timerDisplay) {
        timerDisplay.textContent = formatTime(remainingTime);
      }

      if (remainingTime <= 0) {
        clearInterval(timerInterval);
        alert("Tempo scaduto! Invio automatico del quiz.");
        submitQuiz();
      }
    }, 1000);
  }

  // --- GESTIONE FLAG & NOTE ---

  function toggleFlag(questionId) {
    const btn = document.getElementById(`flag-btn-${questionId}`);
    const card = document.getElementById(`q-card-${questionId}`);

    if (flaggedQuestions.has(questionId)) {
      flaggedQuestions.delete(questionId);
      if (btn) {
        btn.classList.remove("flagged");
        btn.innerText = "🚩 Flag";
      }
      if (card) card.classList.remove("is-flagged");
    } else {
      flaggedQuestions.add(questionId);
      if (btn) {
        btn.classList.add("flagged");
        btn.innerText = "🚩 Flaggata (Rimuovi)";
      }
      if (card) card.classList.add("is-flagged");
    }
  }

  function expandNotes(textarea) {
    textarea.rows = 3;
  }

  function collapseNotes(textarea) {
    if (!textarea.value.trim()) {
      textarea.rows = 1;
    }
  }

  // --- RENDERING DELL'INTERFACCIA ---

  function renderQuiz() {
    const container = document.getElementById("quiz-container");
    if (!container) return;

    container.innerHTML = "";

    selectedQuestions.forEach((q, index) => {
      const topicLabel = TOPIC_NAMES[q.argomento] || q.argomento;
      const qBox = document.createElement("div");
      qBox.className = "question-card";
      qBox.id = `q-card-${q.id}`;

      qBox.innerHTML = `
        <div class="question-header" style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong>Quesito ${index + 1}</strong> <small>(${topicLabel})</small>
          </div>
          <button 
            type="button" 
            id="flag-btn-${q.id}" 
            class="btn-flag ${flaggedQuestions.has(q.id) ? 'flagged' : ''}" 
            onclick="QuizApp.toggleFlag(${q.id})">
            ${flaggedQuestions.has(q.id) ? '🚩 Flaggata (Rimuovi)' : '🚩 Flag'}
          </button>
        </div>
        <p class="question-text">${q.domanda}</p>
        <div class="answers-group">
          ${q.risposte
            .map(
              (r) => `
            <label class="answer-option">
              <input type="radio" name="question_${q.id}" value="${r.id}" ${userAnswers[q.id] === r.id ? 'checked' : ''} onchange="QuizApp.saveAnswer(${q.id}, '${r.id}')">
              <span>${r.testo}</span>
            </label>
          `
            )
            .join("")}
        </div>
        <div class="notes-group" style="margin-top: 12px;">
          <textarea 
            class="question-notes" 
            rows="1" 
            placeholder="Spazio per appunti/ragionamento..." 
            onfocus="QuizApp.expandNotes(this)" 
            onblur="QuizApp.collapseNotes(this)"
          ></textarea>
        </div>
      `;
      container.appendChild(qBox);
    });
  }

  function saveAnswer(questionId, selectedId) {
    userAnswers[questionId] = selectedId;
  }

  // --- CALCOLO RISULTATI ---

  function submitQuiz() {
    if (timerInterval) clearInterval(timerInterval);

    const stats = {};
    selectedQuestions.forEach((q) => {
      if (!stats[q.argomento]) {
        stats[q.argomento] = { total: 0, correct: 0 };
      }
    });

    let totalScore = 0;
    const wrongAnswers = [];
    const correctAnswers = [];

    selectedQuestions.forEach((q) => {
      const arg = q.argomento;
      stats[arg].total++;

      const userAnswer = userAnswers[q.id];
      const isCorrect = userAnswer === q.corretta;

      const selectedText =
        q.risposte.find((r) => r.id === userAnswer)?.testo ||
        "Nessuna risposta data";
      const correctText =
        q.risposte.find((r) => r.id === q.corretta)?.testo || "";

      if (isCorrect) {
        totalScore += 1;
        stats[arg].correct++;
        correctAnswers.push({
          domanda: q.domanda,
          argomento: TOPIC_NAMES[q.argomento] || q.argomento,
          rispostaCorretta: `${q.corretta} - ${correctText}`,
        });
      } else {
        wrongAnswers.push({
          domanda: q.domanda,
          argomento: TOPIC_NAMES[q.argomento] || q.argomento,
          rispostaUtente: `${userAnswer || "Omessa"} - ${selectedText}`,
          rispostaCorretta: `${q.corretta} - ${correctText}`,
        });
      }
    });

    lastWrongAnswersData = wrongAnswers;
    renderResults(totalScore, stats, wrongAnswers, correctAnswers);
  }

  function renderResults(totalScore, stats, wrongAnswers, correctAnswers = []) {
    document.getElementById("quiz-section").style.display = "none";
    const resultsContainer = document.getElementById("results-section");
    resultsContainer.style.display = "block";

    let html = `
      <h2>Risultati del Quiz</h2>
      <div class="score-summary">
        <h3>Punteggio Totale: ${totalScore} / ${selectedQuestions.length}</h3>
      </div>
      <hr>
      <h3>Dettaglio per Argomento:</h3>
      <table class="stats-table">
        <thead>
          <tr>
            <th>Argomento</th>
            <th>Punti Ottenuti</th>
            <th>Quesiti Totali</th>
            <th>Percentuale di Successo</th>
          </tr>
        </thead>
        <tbody>
    `;

    Object.keys(stats).forEach((arg) => {
      const s = stats[arg];
      const percentage =
        s.total > 0 ? ((s.correct / s.total) * 100).toFixed(1) : 0;
      const topicLabel = TOPIC_NAMES[arg] || arg;
      html += `
        <tr>
          <td><strong>${topicLabel}</strong></td>
          <td>${s.correct}</td>
          <td>${s.total}</td>
          <td><strong>${percentage}%</strong></td>
        </tr>
      `;
    });

    html += `</tbody></table><hr>`;

    // --- SEZIONE RISPOSTE ERRATE/OMESSE ---
    html += `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
        <h3>Quesiti Errati od Omessi (${wrongAnswers.length}):</h3>
        ${
          wrongAnswers.length > 0
            ? `<button type="button" class="btn-copy" onclick="QuizApp.copyWrongAnswers()">📋 Copia errori negli appunti</button>`
            : ""
        }
      </div>
    `;

    if (wrongAnswers.length === 0) {
      html += `<p class="success-msg">Complimenti! Hai risposto correttamente a tutte le domande!</p>`;
    } else {
      html += `<div class="wrong-answers-list">`;
      wrongAnswers.forEach((item, idx) => {
        html += `
          <div class="wrong-item" style="border-left: 4px solid #e74c3c; padding-left: 10px; margin-bottom: 15px;">
            <p><strong>${idx + 1}. [${item.argomento}] ${item.domanda}</strong></p>
            <p class="txt-wrong" style="color: #c0392b;">✖ Tua risposta: ${item.rispostaUtente}</p>
            <p class="txt-correct" style="color: #27ae60;">✔ Risposta corretta: ${item.rispostaCorretta}</p>
          </div>
        `;
      });
      html += `</div>`;
    }

    html += `<hr>`;

    // --- SEZIONE RISPOSTE CORRETTE ---
    html += `<h3>Quesiti Risposti Correttamente (${correctAnswers.length}):</h3>`;

    if (correctAnswers.length === 0) {
      html += `<p>Nessuna risposta corretta in questo tentativo.</p>`;
    } else {
      html += `<div class="correct-answers-list">`;
      correctAnswers.forEach((item, idx) => {
        html += `
          <div class="correct-item" style="border-left: 4px solid #2ecc71; padding-left: 10px; margin-bottom: 15px;">
            <p><strong>${idx + 1}. [${item.argomento}] ${item.domanda}</strong></p>
            <p class="txt-correct" style="color: #27ae60;">✔ Risposta data: ${item.rispostaCorretta}</p>
          </div>
        `;
      });
      html += `</div>`;
    }

    // Pulsante per ricominciare la prova
    html += `
      <div style="margin-top: 30px; text-align: center;">
        <button type="button" class="btn-submit" onclick="location.reload()">🔄 Nuovo Quiz</button>
      </div>
    `;

    resultsContainer.innerHTML = html;
  }

  // --- COPIA NEGLI APPUNTI ---

  function copyWrongAnswers() {
    if (!lastWrongAnswersData || lastWrongAnswersData.length === 0) return;

    let textToCopy = "=== QUESITI ERRATI / OMESSI ===\n\n";

    lastWrongAnswersData.forEach((item, idx) => {
      textToCopy += `${idx + 1}. [${item.argomento}] ${item.domanda}\n`;
      textToCopy += `   Tua risposta: ${item.rispostaUtente}\n`;
      textToCopy += `   Risposta corretta: ${item.rispostaCorretta}\n\n`;
    });
    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        alert("Domande errate copiate negli appunti!");
      })
      .catch((err) => {
        console.error("Errore nel copiare il testo: ", err);
        alert("Impossibile copiare negli appunti. Controlla i permessi del browser.");
      });
  }

  // --- INIZIALIZZAZIONE ---

  async function init() {
    try {
      allQuestionsData = await waitForQuestions(5000);
      document.getElementById("config-section").style.display = "block";
    } catch (error) {
      console.error(error);
      alert("Errore durante il caricamento del quiz. Ricarica la pagina.");
    }
  }

  function waitForQuestions(maxWaitMs = 5000, pollIntervalMs = 100) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const check = setInterval(() => {
        if (
          window.questionsData &&
          Array.isArray(window.questionsData) &&
          window.questionsData.length > 0
        ) {
          clearInterval(check);
          resolve(window.questionsData);
        } else if (Date.now() - startTime > maxWaitMs) {
          clearInterval(check);
          reject(
            new Error(
              "Timeout: caricamento di questions.js fallito o file vuoto."
            )
          );
        }
      }, pollIntervalMs);
    });
  }

  window.QuizApp = {
    init,
    saveAnswer,
    submitQuiz,
    toggleFlag,
    copyWrongAnswers,
    expandNotes,
    collapseNotes,
    onModeChange,
    startQuizFromConfig,
  };
})();
