const status = document.getElementById("status");
const boardEl = document.getElementById("board");
const wordForm = document.getElementById("word-form");
const wordInput = document.getElementById("word-input");
const wordHistory = document.getElementById("word-history");
const playerList = document.getElementById("player-list");
const gemCountEl = document.getElementById("gem-count");
const gemButtons = document.querySelectorAll(".gem-actions button");
const startTimerBtn = document.getElementById("start-timer");
const timeRemainingEl = document.getElementById("time-remaining");

const letterPool = [
  { letters: "AEIO", value: 1, weight: 32 },
  { letters: "DGLNRSTU", value: 2, weight: 28 },
  { letters: "BCFHMVPWY", value: 3, weight: 20 },
  { letters: "K", value: 4, weight: 8 },
  { letters: "JX", value: 5, weight: 6 },
  { letters: "QZ", value: 8, weight: 6 }
];

const multiplierTiles = ["DL", "DL", "TL", "TL"];
const wordTiles = ["DW", "DW", "TW"];
const gemTileCount = 5;

let board = [];
let gemCount = 3;
let timerInterval = null;
let timeRemaining = 30;

const samplePlayers = [
  { id: "me", name: "You", score: 0, isActive: true },
  { id: "1", name: "Nova", score: 28 },
  { id: "2", name: "Atlas", score: 21 },
  { id: "3", name: "Mira", score: 17 }
];

const renderPlayers = () => {
  playerList.innerHTML = "";
  samplePlayers
    .sort((a, b) => b.score - a.score)
    .forEach((player, index) => {
      const li = document.createElement("li");
      if (player.isActive) li.classList.add("active");
      li.innerHTML = `
        <span>${index + 1}. ${player.name}</span>
        <span>${player.score}</span>
      `;
      playerList.appendChild(li);
    });
};

const randomLetter = () => {
  const totalWeight = letterPool.reduce((sum, set) => sum + set.weight, 0);
  const target = Math.random() * totalWeight;
  let cumulative = 0;
  for (const set of letterPool) {
    cumulative += set.weight;
    if (target <= cumulative) {
      const letters = set.letters;
      const letter = letters[Math.floor(Math.random() * letters.length)];
      return { letter, value: set.value };
    }
  }
  return { letter: "E", value: 1 };
};

const generateBoard = () => {
  const tiles = Array.from({ length: 25 }, () => ({ ...randomLetter(), id: crypto.randomUUID() }));
  const availableIndexes = [...tiles.keys()];

  const assignSpecial = (tilesToAssign, key) => {
    for (const type of tilesToAssign) {
      if (!availableIndexes.length) break;
      const idx = availableIndexes.splice(Math.floor(Math.random() * availableIndexes.length), 1)[0];
      tiles[idx] = { ...tiles[idx], [key]: type };
    }
  };

  assignSpecial(multiplierTiles, "multiplier");
  assignSpecial(wordTiles, "word");

  const gemIndexes = [...availableIndexes].sort(() => Math.random() - 0.5).slice(0, gemTileCount);
  for (const idx of gemIndexes) {
    tiles[idx] = { ...tiles[idx], gem: true };
  }

  return tiles;
};

const renderBoard = () => {
  boardEl.innerHTML = "";
  board.forEach((tile) => {
    const tileEl = document.createElement("div");
    tileEl.className = "tile";
    if (tile.multiplier) tileEl.dataset.multiplier = tile.multiplier;
    if (tile.word) tileEl.dataset.word = tile.word;
    if (tile.gem) tileEl.dataset.gem = "true";
    tileEl.innerHTML = `
      <div class="letter">${tile.letter}</div>
      <div class="value">${tile.value}pt</div>
    `;
    boardEl.appendChild(tileEl);
  });
};

const updateGemCount = (value) => {
  gemCount = Math.max(0, Math.min(10, value));
  gemCountEl.textContent = gemCount;
  gemButtons.forEach((button) => {
    const cost = Number(button.querySelector("span").textContent.replace(/[^0-9]/g, ""));
    button.disabled = gemCount < cost;
  });
};

const spendGems = (cost) => {
  if (gemCount < cost) return false;
  updateGemCount(gemCount - cost);
  return true;
};

const applyShuffle = () => {
  if (!spendGems(1)) return;
  board = generateBoard();
  renderBoard();
  flashStatus("Board shuffled", "info");
};

const applySwap = () => {
  if (!spendGems(3)) return;
  const idxA = Math.floor(Math.random() * board.length);
  let idxB = Math.floor(Math.random() * board.length);
  while (idxB === idxA) idxB = Math.floor(Math.random() * board.length);
  [board[idxA], board[idxB]] = [board[idxB], board[idxA]];
  renderBoard();
  flashStatus("Two tiles swapped", "info");
};

const applyHint = () => {
  if (!spendGems(4)) return;
  const candidate = [...board].sort((a, b) => b.value - a.value)[0];
  if (!candidate) return;
  flashStatus(`Look for words with <strong>${candidate.letter}</strong> for max value!`, "hint");
};

const actionHandlers = {
  shuffle: applyShuffle,
  swap: applySwap,
  hint: applyHint
};

gemButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const action = button.dataset.action;
    actionHandlers[action]?.();
  });
});

const flashStatus = (message, type = "info") => {
  status.innerHTML = message;
  status.dataset.type = type;
  if (type === "hint") {
    status.style.color = "var(--success)";
  } else {
    status.style.color = "var(--muted)";
  }
  setTimeout(() => {
    status.style.color = "var(--muted)";
  }, 3200);
};

const scoreWord = (word) => {
  const letters = word.toUpperCase().split("");
  const letterCounts = {};
  letters.forEach((letter) => {
    letterCounts[letter] = (letterCounts[letter] || 0) + 1;
  });

  let baseScore = 0;
  let wordMultiplier = 1;
  let gemsEarned = 0;

  const boardCopy = board.map((tile) => ({ ...tile, used: false }));

  for (const letter of letters) {
    const tileIndex = boardCopy.findIndex((tile) => tile.letter === letter && !tile.used);
    if (tileIndex === -1) return null;

    const tile = boardCopy[tileIndex];
    tile.used = true;

    let letterScore = tile.value;
    if (tile.multiplier === "DL") letterScore *= 2;
    if (tile.multiplier === "TL") letterScore *= 3;
    baseScore += letterScore;

    if (tile.word === "DW") wordMultiplier *= 2;
    if (tile.word === "TW") wordMultiplier *= 3;
    if (tile.gem) gemsEarned += 1;
  }

  if (letters.length >= 6) baseScore += 10;

  gemsEarned = Math.min(gemsEarned, Math.max(0, 10 - gemCount));

  return {
    score: baseScore * wordMultiplier,
    gems: gemsEarned
  };
};

const addWordToHistory = (word, score) => {
  const entry = document.createElement("div");
  entry.className = "word-entry";
  entry.innerHTML = `<strong>${word.toUpperCase()}</strong><span>+${score} pts</span>`;
  wordHistory.prepend(entry);
};

wordForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(wordForm);
  const submittedWord = String(formData.get("word")).trim();
  if (!submittedWord) return;
  const result = scoreWord(submittedWord);
  if (!result) {
    flashStatus("Letters must exist on the board", "error");
    status.style.color = "var(--danger)";
    return;
  }

  addWordToHistory(submittedWord, result.score);
  const player = samplePlayers.find((p) => p.id === "me");
  if (player) player.score += result.score;
  if (result.gems > 0) updateGemCount(gemCount + result.gems);
  renderPlayers();
  flashStatus(`Word scored ${result.score} points`, "success");
  status.style.color = "var(--success)";
  wordForm.reset();
  wordInput.focus();
});

const resetTimer = () => {
  clearInterval(timerInterval);
  timerInterval = null;
  timeRemaining = 30;
  timeRemainingEl.textContent = timeRemaining;
  startTimerBtn.disabled = false;
};

startTimerBtn.addEventListener("click", () => {
  if (timerInterval) return;
  startTimerBtn.disabled = true;
  flashStatus("Round started", "info");
  timerInterval = setInterval(() => {
    timeRemaining -= 1;
    timeRemainingEl.textContent = Math.max(0, timeRemaining);
    if (timeRemaining <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      flashStatus("Round complete", "success");
      status.style.color = "var(--success)";
      setTimeout(() => startTimerBtn.removeAttribute("disabled"), 1200);
    }
  }, 1000);
});

const initDiscord = async () => {
  const { discordSdk } = window;
  if (!discordSdk) {
    flashStatus("Discord SDK unavailable", "error");
    status.style.color = "var(--danger)";
    return;
  }

  try {
    await discordSdk.ready;
    const auth = await discordSdk.commands.authenticate();
    const player = samplePlayers.find((p) => p.id === "me");
    if (player) player.name = auth.user.username;
    renderPlayers();
    flashStatus(`Authenticated as ${auth.user.username}`, "success");
    status.style.color = "var(--success)";
  } catch (error) {
    console.error(error);
    flashStatus("Failed to authenticate with Discord", "error");
    status.style.color = "var(--danger)";
  }
};

const boot = () => {
  board = generateBoard();
  renderBoard();
  updateGemCount(gemCount);
  renderPlayers();
  resetTimer();
  initDiscord();
};

boot();
