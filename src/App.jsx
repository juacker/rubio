import { useMemo, useState } from 'react';

const difficultyConfig = {
  easy: {
    add: { min: 0, max: 20 },
    sub: { min: 0, max: 20, noNegative: true },
    mul: { min: 0, max: 5 },
    div: { minDivisor: 1, maxDivisor: 5, maxQuotient: 5 },
  },
  medium: {
    add: { min: 0, max: 80 },
    sub: { min: 0, max: 80, noNegative: true },
    mul: { min: 0, max: 10 },
    div: { minDivisor: 1, maxDivisor: 10, maxQuotient: 10 },
  },
  hard: {
    add: { min: 200, max: 5000 },
    sub: { min: 200, max: 5000, noNegative: true },
    mul: { min: 12, max: 60 },
    div: { minDivisor: 6, maxDivisor: 30, maxQuotient: 120 },
  },
};

const operationSymbols = {
  add: '+',
  sub: '-',
  mul: '×',
  div: '÷',
};

const operationLabels = {
  add: 'Addition',
  sub: 'Subtraction',
  mul: 'Multiplication',
  div: 'Division',
};

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom(list) {
  return list[randomInt(0, list.length - 1)];
}

function makeAddition(config) {
  const left = randomInt(config.min, config.max);
  const right = randomInt(config.min, config.max);
  return { left, right, answer: left + right };
}

function makeSubtraction(config) {
  const a = randomInt(config.min, config.max);
  const b = randomInt(config.min, config.max);
  const left = config.noNegative ? Math.max(a, b) : a;
  const right = config.noNegative ? Math.min(a, b) : b;
  return { left, right, answer: left - right };
}

function makeMultiplication(config) {
  const left = randomInt(config.min, config.max);
  const right = randomInt(config.min, config.max);
  return { left, right, answer: left * right };
}

function makeDivision(config) {
  const divisor = randomInt(config.minDivisor, config.maxDivisor);
  const quotient = randomInt(1, config.maxQuotient);
  const dividend = divisor * quotient;
  return { left: dividend, right: divisor, answer: quotient };
}

function createExercise(operation, difficulty) {
  const config = difficultyConfig[difficulty][operation];
  const factoryByOperation = {
    add: makeAddition,
    sub: makeSubtraction,
    mul: makeMultiplication,
    div: makeDivision,
  };

  const math = factoryByOperation[operation](config);
  return {
    ...math,
    operation,
    text: `${math.left} ${operationSymbols[operation]} ${math.right} =`,
  };
}

function digitsCount(value) {
  return Math.abs(value).toString().length;
}

function stackWidthInCh(exercise) {
  return Math.max(digitsCount(exercise.left), digitsCount(exercise.right)) + 1;
}

function mulPartialLines(exercise) {
  const d = digitsCount(exercise.right);
  return d >= 2 ? d : 0;
}

function divWorkLines(exercise) {
  return digitsCount(exercise.answer) * 2;
}

function App() {
  const [operations, setOperations] = useState(['add', 'sub', 'mul', 'div']);
  const [difficulty, setDifficulty] = useState('medium');
  const [counts, setCounts] = useState({ add: 3, sub: 3, mul: 2, div: 2 });
  const [exercises, setExercises] = useState([]);
  const [answers, setAnswers] = useState({});
  const [results, setResults] = useState([]);
  const [message, setMessage] = useState('Select settings and generate exercises to start.');
  const [score, setScore] = useState('');
  const [lastSettings, setLastSettings] = useState(null);

  const printMeta = useMemo(() => {
    if (!lastSettings) {
      return { date: '', difficulty: '', ops: '' };
    }

    const readableOps = lastSettings.operations.map((op) => operationLabels[op]).join(', ');
    const readableDifficulty =
      lastSettings.difficulty.charAt(0).toUpperCase() + lastSettings.difficulty.slice(1);
    const today = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return { date: today, difficulty: readableDifficulty, ops: readableOps };
  }, [lastSettings]);

  const writtenGroups = useMemo(() => {
    const order = ['add', 'sub', 'mul', 'div'];
    let counter = 0;
    const grouped = order
      .map((operation) => ({
        operation,
        label: operationLabels[operation],
        items: exercises
          .filter((exercise) => exercise.operation === operation)
          .map((exercise) => {
            counter += 1;
            return { ...exercise, number: counter };
          }),
      }))
      .filter((group) => group.items.length > 0);
    return grouped;
  }, [exercises]);

  function toggleOperation(op) {
    setOperations((prev) => {
      if (prev.includes(op)) {
        return prev.filter((value) => value !== op);
      }
      return [...prev, op];
    });
  }

  function generateExercises() {
    if (!operations.length) {
      setMessage('Please select at least one operation.');
      setExercises([]);
      setAnswers({});
      setResults([]);
      setScore('');
      return;
    }

    const total = operations.reduce((sum, op) => sum + (counts[op] || 0), 0);
    if (total < 1) {
      setMessage('Set at least 1 exercise for a selected operation.');
      return;
    }

    const seen = new Set();
    const capped = [];
    const generated = operations.flatMap((op) => {
      const items = [];
      const target = counts[op] || 0;
      let attempts = 0;
      while (items.length < target && attempts < target * 20) {
        attempts += 1;
        const exercise = createExercise(op, difficulty);
        const key = `${op}:${exercise.left}:${exercise.right}`;
        if (!seen.has(key)) {
          seen.add(key);
          items.push(exercise);
        }
      }
      if (items.length < target) {
        capped.push(`${operationLabels[op]}: ${items.length}/${target}`);
      }
      return items;
    });

    setExercises(generated);
    setAnswers({});
    setResults(Array.from({ length: generated.length }, () => null));
    setScore('');
    setLastSettings({ operations: [...operations], difficulty });
    if (capped.length > 0) {
      setMessage(`Some operations have limited unique combinations (${capped.join(', ')}). Try a harder difficulty for more.`);
    } else {
      setMessage('Solve the exercises, then click Check Answers.');
    }
  }

  function checkAnswers() {
    if (!exercises.length) {
      setMessage('Generate exercises first.');
      return;
    }

    let correct = 0;
    const nextResults = exercises.map((exercise, index) => {
      const rawAnswer = answers[index];
      const given = Number(rawAnswer);
      const isCorrect = Number.isFinite(given) && given === exercise.answer;

      if (isCorrect) {
        correct += 1;
      }

      return {
        isCorrect,
        text: isCorrect ? 'Correct' : `Wrong. Correct: ${exercise.answer}`,
      };
    });

    setResults(nextResults);
    setScore(`Score: ${correct} / ${exercises.length}`);
  }

  function printWorksheet() {
    if (!exercises.length) {
      setMessage('Generate exercises first so there is something to print.');
      return;
    }
    window.print();
  }

  function cleanUpWorksheet() {
    if (!exercises.length) {
      setMessage('Generate exercises first.');
      return;
    }
    setAnswers({});
    setResults(Array.from({ length: exercises.length }, () => null));
    setScore('');
    setMessage('Worksheet cleaned. You can solve again or generate a new one.');
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">Rubio</p>
        </div>

        <nav className="sidebar-nav" aria-label="App sections">
          <button type="button" className="nav-item active">
            <span className="nav-label">Practice</span>
            <span className="nav-hint">Random exercises</span>
          </button>
        </nav>
      </aside>

      <section className="content-area">
        <section className="panel practice-workspace" aria-live="polite">
          <div className="workspace-header">
            <h2>Practice</h2>
            <p className="score">{score}</p>
          </div>
          <p className="message">{message}</p>
          <div className="print-header">
            <div className="print-title">
              <h1>Math Practice</h1>
              <p className="print-subtitle">{printMeta.difficulty} &middot; {printMeta.ops}</p>
            </div>
            <div className="print-fields">
              <p className="print-field">Name: <span className="print-blank" /></p>
              <p className="print-field">Date: <span className="print-blank" /></p>
            </div>
          </div>

          <div className="workspace-grid">
            <form className="settings-panel" onSubmit={(event) => event.preventDefault()}>
              <fieldset>
                <legend>Operations</legend>
                {['add', 'sub', 'mul', 'div'].map((op) => {
                  const checked = operations.includes(op);
                  return (
                    <div className="op-row" key={op}>
                      <label className="toggle">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleOperation(op)}
                        />
                        <span className="toggle-track" />
                        <span className="toggle-label">{operationLabels[op]}</span>
                      </label>
                      <input
                        type="number"
                        className="op-count"
                        min="0"
                        max="10"
                        disabled={!checked}
                        value={counts[op]}
                        onChange={(event) =>
                          setCounts((prev) => ({ ...prev, [op]: Number(event.target.value) }))
                        }
                      />
                    </div>
                  );
                })}
              </fieldset>

              <label htmlFor="difficulty">Difficulty</label>
              <select
                id="difficulty"
                value={difficulty}
                onChange={(event) => setDifficulty(event.target.value)}
              >
                <option value="easy">Easy (Early Primary)</option>
                <option value="medium">Medium (Mid Primary)</option>
                <option value="hard">Hard (Upper Primary)</option>
              </select>

              <div className="actions">
                <button type="button" onClick={generateExercises}>
                  Generate
                </button>
                <button type="button" className="secondary" onClick={checkAnswers}>
                  Check
                </button>
              </div>
              <div className="actions-aux">
                <button type="button" className="icon-btn" title="Print worksheet" onClick={printWorksheet}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V2h12v7" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>
                  <span>Print</span>
                </button>
                <button type="button" className="icon-btn" title="Clear answers" onClick={cleanUpWorksheet}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>
                  <span>Clear</span>
                </button>
              </div>
            </form>

            <section className="exercise-sheet">
              <div className="exercise-header">
                <h3>Exercises</h3>
              </div>
              <ol id="exercise-list">
                {exercises.map((exercise, index) => {
                  const result = results[index];
                  return (
                    <li className="exercise-item" key={`${exercise.text}-${index}`}>
                      <label htmlFor={`answer-${index}`}>{exercise.text}</label>
                      <input
                        id={`answer-${index}`}
                        type="number"
                        inputMode="numeric"
                        autoComplete="off"
                        value={answers[index] ?? ''}
                        onChange={(event) => {
                          const value = event.target.value;
                          setAnswers((prev) => ({ ...prev, [index]: value }));
                        }}
                      />
                      <span className={`result ${result ? (result.isCorrect ? 'ok' : 'bad') : ''}`}>
                        {result ? result.text : ''}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </section>
          </div>

          <section className="print-written-sheet" aria-hidden="true">
            {writtenGroups.map((group) => (
              <section className={`written-group op-${group.operation}`} key={group.operation}>
                <h3>{group.label}</h3>
                <div className="written-grid">
                  {group.items.map((exercise, index) => {
                    if (exercise.operation === 'div') {
                      return (
                        <div
                          className="written-problem division-problem"
                          style={{ '--work-lines': divWorkLines(exercise) }}
                          key={`${group.operation}-${index}`}
                        >
                          <span className="problem-number">{exercise.number}</span>
                          <div className="caja-layout">
                            <span className="caja-dividend">{exercise.left}</span>
                            <div className="caja-box">
                              <span className="caja-divisor">{exercise.right}</span>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    {
                      const partials = exercise.operation === 'mul' ? mulPartialLines(exercise) : 0;
                      return (
                        <div className="written-problem" key={`${group.operation}-${index}`}>
                          <span className="problem-number">{exercise.number}</span>
                          <div
                            className="stacked-layout"
                            style={{ width: `${stackWidthInCh(exercise)}ch` }}
                          >
                            <div className="stack-line">
                              <span className="stack-op-placeholder" />
                              <span>{exercise.left}</span>
                            </div>
                            <div className="stack-line">
                              <span className="stack-op">{operationSymbols[exercise.operation]}</span>
                              <span>{exercise.right}</span>
                            </div>
                            <div className="stack-answer-line" />
                            {partials > 0 ? (
                              <>
                                {Array.from({ length: partials }, (_, i) => (
                                  <div className="stack-partial-space" key={i} />
                                ))}
                                <div className="stack-answer-space" />
                              </>
                            ) : (
                              <div className="stack-answer-space" />
                            )}
                          </div>
                        </div>
                      );
                    }
                  })}
                </div>
              </section>
            ))}
          </section>
        </section>
      </section>
    </main>
  );
}

export default App;
