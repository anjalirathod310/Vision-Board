const DB_NAME = "VisionBoard2026";
const DB_VERSION = 1;
const STORE = "achievements";
let db;

const SECTION_TITLES = {
  career: "Career",
  health: "Health & Fitness",
  lifestyle: "Lifestyle",
  money: "Money & Wealth",
  mindset: "Mindset",
  hobbies: "Hobbies & Joy"
};

/* ================= DB ================= */

function openDB() {
  return new Promise(resolve => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      e.target.result.createObjectStore(STORE, { autoIncrement: true });
    };
    req.onsuccess = () => {
      db = req.result;
      resolve();
    };
  });
}

/* ================= GOALS SYNC ================= */

function populateCardGoals() {
  document.querySelectorAll(".card").forEach(card => {
    const section = card.dataset.section;
    const list = card.querySelector(".card-back .goals");
    if (!section || !list) return;

    // Remove the header override so HTML headings are respected
    // (Or keep it if you truly want JS to force titles)
    
    list.innerHTML = "";

    // 1. Try reading standard localStorage (if "goals-career" exists)
    let savedGoals = [];
    try {
      const raw = localStorage.getItem(`goals-${section}`);
      savedGoals = raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn("Error parsing goals for", section, e);
    }

    // 2. Filter out empty strings
    const validGoals = savedGoals.filter(g => g && g.trim().length > 0);

    // 3. Render
    if (validGoals.length === 0) {
      const emptyLi = document.createElement("li");
      emptyLi.textContent = "(No goals set yet)";
      emptyLi.style.fontStyle = "italic";
      emptyLi.style.color = "#999";
      list.appendChild(emptyLi);
    } else {
      validGoals.forEach(goal => {
        const li = document.createElement("li");
        li.textContent = goal;
        list.appendChild(li);
      });
    }
  });
}

/* ================= SOUNDS ================= */

const audioHover = new Audio("assets/sounds/hover.mp3");
const audioFlip = new Audio("assets/sounds/flipcard.mp3");

// Preload
audioHover.volume = 0.2; // Keep hover subtle
audioFlip.volume = 0.4;

/* ================= FLIP ================= */

document.querySelectorAll(".card").forEach(card => {
  // Hover Sound
  card.addEventListener("mouseenter", () => {
    // Clone to allow rapid replays
    const sound = audioHover.cloneNode();
    sound.volume = 0.2;
    sound.play().catch(() => {}); // Catch autoplay blocks
  });

  // Flip Logic
  card.querySelector(".card-inner").addEventListener("click", e => {
    // If clicking the button, do nothing (handled below)
    if (e.target.closest("button")) return;
    
    // Play flip sound
    const sound = audioFlip.cloneNode();
    sound.volume = 0.4;
    sound.play().catch(() => {});

    card.classList.toggle("is-flipped");
  });
});

/* ================= MY ACHIEVEMENTS BUTTON ================= */

document.querySelectorAll(".card").forEach(card => {
  const section = card.dataset.section;
  const openBtn = card.querySelector(".open-btn");

  if (!openBtn) return;

  openBtn.addEventListener("click", e => {
    e.stopPropagation();
    window.open(`achievements.html?section=${section}`, "_blank");
  });
});

/* ================= INIT ================= */

(async () => {
  await openDB();
  populateCardGoals();
})();

window.addEventListener("storage", e => {
  if (e.key && e.key.startsWith("goals-")) {
    populateCardGoals();
  }
});
