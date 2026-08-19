/**
 * Logica del Quiz Online
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

  // Configurazione dei requisiti per argomento
  const REQUIREMENTS = {
    A: 20,
    B: 15,
    C: 10,
    D: 20,
    E: 15,
  };

  const TOTAL_DURATION_SECONDS = 2 * 60 * 60; // 2 ore in secondi

  let selectedQuestions = [];
  let userAnswers = {}; // Mappa { questionId: "opzioneSelezionata" }
  let timerInterval = null;
  let remainingTime = TOTAL_DURATION_SECONDS;

  // --- FUNZIONI DI UTILITÀ ---

  // Algoritmo Fisher-Yates per mescolare un array in modo casuale
  function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // Estrae N domande casuali per ciascun argomento e mescola le loro risposte
  function selectQuestions(allQuestions) {
    const result = [];

    Object.keys(REQUIREMENTS).forEach((arg) => {
      const countNeeded = REQUIREMENTS[arg];
      const available = allQuestions.filter((q) => q.argomento === arg);

      if (available.length < countNeeded) {
        console.warn(
          `Attenzione: Per l'argomento "${TOPIC_NAMES[arg] || arg}" sono disponibili solo ${available.length} domande su ${countNeeded} richieste.`,
        );
      }

      const shuffledArg = shuffle(available);
      result.push(...shuffledArg.slice(0, countNeeded));
    });

    // Mescola l'ordine finale delle domande nel quiz
    const finalQuestions = shuffle(result);

    // Crea una copia profonda e mescola le opzioni di risposta per ogni domanda
    return finalQuestions.map((q) => ({
      ...q,
      risposte: shuffle(q.risposte),
    }));
  }

  // Formatting del tempo HH:MM:SS
  function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
  }

  // --- TIMER ---

  function startTimer() {
    const timerDisplay = document.getElementById("timer-display");

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

  // --- RENDERING DELL'INTERFACCIA ---

  function renderQuiz() {
    const container = document.getElementById("quiz-container");
    if (!container) return;

    container.innerHTML = "";

    selectedQuestions.forEach((q, index) => {
      const topicLabel = TOPIC_NAMES[q.argomento] || q.argomento;
      const qBox = document.createElement("div");
      qBox.className = "question-card";
      qBox.innerHTML = `
        <div class="question-header">
          <strong>Quesito ${index + 1}</strong> <small>(${topicLabel})</small>
        </div>
        <p class="question-text">${q.domanda}</p>
        <div class="answers-group">
          ${q.risposte
            .map(
              (r) => `
            <label class="answer-option">
              <input type="radio" name="question_${q.id}" value="${r.id}" onchange="QuizApp.saveAnswer(${q.id}, '${r.id}')">
              <span>${r.testo}</span>
            </label>
          `,
            )
            .join("")}
        </div>
      `;
      container.appendChild(qBox);
    });
  }

  // Salvataggio risposta utente
  function saveAnswer(questionId, selectedId) {
    userAnswers[questionId] = selectedId;
  }

  // --- CALCOLO RISULTATI ---

  function submitQuiz() {
    if (timerInterval) clearInterval(timerInterval);

    // Dati per report per argomento
    const stats = {};
    Object.keys(REQUIREMENTS).forEach((arg) => {
      stats[arg] = { total: 0, correct: 0 };
    });

    let totalScore = 0;
    const wrongAnswers = [];

    selectedQuestions.forEach((q) => {
      const arg = q.argomento;
      if (!stats[arg]) stats[arg] = { total: 0, correct: 0 };

      stats[arg].total++;

      const userAnswer = userAnswers[q.id];
      const isCorrect = userAnswer === q.corretta;

      if (isCorrect) {
        totalScore += 1; // 1 punto per risposta esatta
        stats[arg].correct++;
      } else {
        // Traccia domande errate o omesse (0 punti)
        const selectedText =
          q.risposte.find((r) => r.id === userAnswer)?.testo ||
          "Nessuna risposta data";
        const correctText =
          q.risposte.find((r) => r.id === q.corretta)?.testo || "";

        wrongAnswers.push({
          domanda: q.domanda,
          argomento: TOPIC_NAMES[q.argomento] || q.argomento,
          rispostaUtente: `${userAnswer || "Omessa"} - ${selectedText}`,
          rispostaCorretta: `${q.corretta} - ${correctText}`,
        });
      }
    });

    renderResults(totalScore, stats, wrongAnswers);
  }

  function renderResults(totalScore, stats, wrongAnswers) {
    // Nascondi container quiz e mostra i risultati
    document.getElementById("quiz-section").style.display = "none";
    const resultsContainer = document.getElementById("results-section");
    resultsContainer.style.display = "block";

    // 1. Punteggio Totale
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

    // 2. Tabella per Argomento
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

    // 3. Elenco Risposte Errate / Omesse
    html += `<h3>Quesiti Errati od Omessi (${wrongAnswers.length}):</h3>`;

    if (wrongAnswers.length === 0) {
      html += `<p class="success-msg">Complimenti! Hai risposto correttamente a tutte le domande!</p>`;
    } else {
      html += `<div class="wrong-answers-list">`;
      wrongAnswers.forEach((item, idx) => {
        html += `
          <div class="wrong-item">
            <p><strong>${idx + 1}. [${item.argomento}] ${item.domanda}</strong></p>
            <p class="txt-wrong">✖ Tua risposta: ${item.rispostaUtente}</p>
            <p class="txt-correct">✔ Risposta corretta: ${item.rispostaCorretta}</p>
          </div>
        `;
      });
      html += `</div>`;
    }

    resultsContainer.innerHTML = html;
  }

  // --- INIZIALIZZAZIONE ---

  async function init() {
    try {
      // Mostra un messaggio di caricamento se necessario
      const container = document.getElementById("quiz-container");
      if (container)
        container.innerHTML = "<p>Caricamento dei quesiti in corso...</p>";

      // Attendi fino a 5 secondi il caricamento effettivo dei dati
      const allQuestions = await waitForQuestions(5000);

      selectedQuestions = selectQuestions(allQuestions);
      renderQuiz();
      startTimer();
    } catch (error) {
      console.error(error);
      alert("Errore durante il caricamento del quiz. Ricarica la pagina.");
    }
  }

  function waitForQuestions(maxWaitMs = 5000, pollIntervalMs = 100) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const check = setInterval(() => {
        // Se l'array esiste ed è popolato, risolvi la Promise
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
              "Timeout: caricamento di questions.js fallito o file vuoto.",
            ),
          );
        }
      }, pollIntervalMs);
    });
  }

  // Esponi funzioni necessarie globalmente
  window.QuizApp = {
    init,
    saveAnswer,
    submitQuiz,
  };
})();
