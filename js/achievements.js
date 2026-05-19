/* ---------------- INIT ---------------- */

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM fully loaded");
  initAchievements();
});

function initAchievements() {
  const params = new URLSearchParams(window.location.search);
  const section = params.get("section") || "career";
  const safeSection = section || "career";

  /* ---------------- ELEMENTS ---------------- */
  const faceImage = document.getElementById("faceImage");
  const title = document.getElementById("sectionTitle");
  const goalsList = document.getElementById("goalsList");
  const gallery = document.getElementById("gallery");
  const fileInput = document.getElementById("fileInput");
  const addBtn = document.getElementById("addAchievement");

  if (!faceImage || !title || !goalsList || !gallery || !fileInput || !addBtn) {
    console.error("Missing critical elements");
    return;
  }

  /* ---------------- SET FACE IMAGE ---------------- */
  faceImage.src = "./assets/" + safeSection + ".jpg";
  faceImage.onerror = () => {
    console.error("Image not found:", faceImage.src);
  };

  title.textContent = safeSection.replace("-", " ").toUpperCase();

  /* ---------------- SOUNDS ---------------- */
  const audioClick = new Audio("assets/sounds/click.mp3");
  const audioPop = new Audio("assets/sounds/confetti-pop.mp3");

  function playClick() {
    const sound = audioClick.cloneNode();
    sound.volume = 0.5;
    sound.play().catch(() => {});
  }

  /* ---------------- GOALS (10 EDITABLE BLANKS) ---------------- */
  const goalsKey = `goals-${section}`;
  let savedGoals = [];
  
  try {
    const raw = localStorage.getItem(goalsKey);
    savedGoals = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(savedGoals)) savedGoals = [];
  } catch (e) {
    console.error("Error parsing saved goals, resetting:", e);
    savedGoals = [];
  }

  goalsList.innerHTML = "";

  for (let i = 0; i < 10; i++) {
    const li = document.createElement("li");
    li.dataset.index = (i + 1).toString().padStart(2, "0");

    const input = document.createElement("input");
    input.type = "text";
    input.className = "goal-input";
    input.value = savedGoals[i] || "";
    input.placeholder = "Type your goal here...";
    input.spellcheck = false;

    // Click sound
    input.addEventListener("click", playClick);

    // Auto-save on input
    input.addEventListener("input", () => {
      saveGoals(goalsList, goalsKey);
    });

    li.appendChild(input);
    goalsList.appendChild(li);
  }

  /* ---------------- ADD ACHIEVEMENT ---------------- */
  addBtn.addEventListener("click", () => {
    playClick();
    fileInput.value = "";
    fileInput.click();
  });

  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) return;
    saveImage(section, file, audioPop);
  });

  /* ---------------- INDEXED DB & GALLERY ---------------- */
  initDB(section);
}

function saveGoals(list, key) {
  const values = [...list.querySelectorAll(".goal-input")].map(input => input.value);
  localStorage.setItem(key, JSON.stringify(values));
}

/* ---------------- DATABASE ---------------- */
let db;
const DB_NAME = "VisionBoard2026";
const DB_VERSION = 1;
const STORE = "achievements";

function initDB(currentSection) {
  const request = indexedDB.open(DB_NAME, DB_VERSION);

  request.onupgradeneeded = e => {
    const database = e.target.result;
    if (!database.objectStoreNames.contains(STORE)) {
      database.createObjectStore(STORE, { autoIncrement: true });
    }
  };

  request.onsuccess = e => {
    db = e.target.result;
    renderGallery(currentSection);
  };

  request.onerror = e => console.error("DB Error:", e);
}

function saveImage(section, file, popSound) {
  if (!db) {
    console.error("Database not ready");
    return;
  }
  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).add({ section, file, createdAt: Date.now() });
  
  tx.oncomplete = () => {
    renderGallery(section);
    
    // CONFETTI & SOUND
    if (popSound) {
      popSound.currentTime = 0;
      popSound.play().catch(() => {});
    }
    
    if (window.confetti) {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#ff9a9e', '#fad0c4', '#fbc2eb', '#a18cd1'] // Pink/Purple theme
      });
    }
  };
}

function deleteImage(key, section) {
  if (!db) return;
  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).delete(key);
  tx.oncomplete = () => renderGallery(section);
}

function renderGallery(section) {
  if (!db) return;
  const gallery = document.getElementById("gallery");
  if (!gallery) return;
  
  gallery.innerHTML = "";
  const tx = db.transaction(STORE, "readonly");
  const store = tx.objectStore(STORE);

  store.openCursor().onsuccess = e => {
    const cursor = e.target.result;
    if (cursor) {
      if (cursor.value.section === section) {
        const wrapper = document.createElement("div");
        wrapper.className = "gallery-item";

        const img = document.createElement("img");
        img.src = URL.createObjectURL(cursor.value.file);
        img.alt = "Achievement";

        const delBtn = document.createElement("button");
        delBtn.className = "delete-btn";
        delBtn.innerHTML = "&times;";
        delBtn.onclick = () => {
          if (confirm("Delete this image?")) {
            deleteImage(cursor.primaryKey, section);
          }
        };

        wrapper.appendChild(img);
        wrapper.appendChild(delBtn);
        gallery.appendChild(wrapper);
      }
      cursor.continue();
    }
  };
}
