const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbww2GIaQkDYozdMg-WOAXnPS8tDxJQWHqKwus3dmywcZDhrh0ZOBnBdExFHm32jOXEN/exec";

const TOTAL_STEPS = 9;
let currentStep = 1;

const SURVEYOR_STORAGE_KEY = "pks_2027_surveyor_prefs_v1";
const APP_COUNTER_STORAGE_KEY = "pks_2027_last_app_no_v1";
const SUBMITTED_NICS_STORAGE_KEY = "pks_2027_submitted_nics_v1";

let lastValidNicValue = "";

const SURVEYOR_PERSIST_FIELDS = [
  "q1_district",
  "q2_dsd",
  "q3_gnd",
  "q4_village",
  "q4a_total_families",
  "q6_date",
  "q6a_officer_info"
];

const CARD_CONTAINERS = [
  "schoolChildrenContainer",
  "landsContainer",
  "livestockContainer",
  "vehiclesContainer",
  "abroadContainer",
  "orphanContainer",
  "disabilityContainer",
  "addictionContainer",
  "welfareContainer",
  "bankContainer",
  "loanContainer"
];

const CONDITIONAL_WRAPS = [
  "ch_school_children_wrap",
  "ch_not_attending_reason_wrap",
  "ch_underweight_reason_wrap",
  "land_cards_wrap",
  "q27_livestock_other_wrap",
  "q20_reason_wrap",
  "q21_reason_wrap",
  "livestock_wrap",
  "q38_other_wrap",
  "phone_details_wrap",
  "vehicles_wrap",
  "aid_details_wrap",
  "abroad_wrap",
  "orphan_wrap",
  "disability_wrap",
  "addiction_wrap",
  "welfare_wrap",
  "loan_wrap",
  "hh_training_details_wrap",
  "hh_license_type_wrap"
];

function setDefaultValues() {
  const districtEl = document.getElementById("q1_district");
  if (districtEl && !districtEl.value.trim()) {
    districtEl.value = "මොණරාගල";
  }

  const dsdEl = document.getElementById("q2_dsd");
  if (dsdEl && !dsdEl.value.trim()) {
    dsdEl.value = "මොණරාගල";
  }

  const dateEl = document.getElementById("q6_date");
  if (dateEl && !dateEl.value) {
    dateEl.value = new Date().toISOString().split("T")[0];
  }
}

function saveSurveyorPrefs(showToast = false) {
  try {
    const prefs = {};
    SURVEYOR_PERSIST_FIELDS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        prefs[id] = (el.value || "").trim();
      }
    });
    localStorage.setItem(SURVEYOR_STORAGE_KEY, JSON.stringify(prefs));
    if (showToast) {
      showNavAlert("success", "සමීක්ෂක හා වසම් මූලික විස්තර ඔබගේ දුරකථනයේ (Local Storage) සුරකින ලදී.");
    }
  } catch (err) {
    console.warn("LocalStorage save error:", err);
  }
}

function loadSurveyorPrefs() {
  try {
    const raw = localStorage.getItem(SURVEYOR_STORAGE_KEY);
    if (!raw) return;
    const prefs = JSON.parse(raw);

    SURVEYOR_PERSIST_FIELDS.forEach((id) => {
      const el = document.getElementById(id);
      if (el && typeof prefs[id] === "string" && prefs[id] !== "") {
        el.value = prefs[id];
      }
    });
  } catch (err) {
    console.warn("LocalStorage load error:", err);
  }
}

function clearSurveyorPrefs() {
  if (!confirm("දුරකථනයේ මතක තබා ඇති සමීක්ෂක හා වසම් විස්තර මකා දැමීමට අවශ්‍යද?")) return;
  try {
    localStorage.removeItem(SURVEYOR_STORAGE_KEY);
  } catch (err) {
    console.warn("LocalStorage clear error:", err);
  }

  SURVEYOR_PERSIST_FIELDS.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  setDefaultValues();
  showNavAlert("info", "මතක තබා තිබූ මූලික විස්තර ඉවත් කර Default අගයන් යොදන ලදී.");
  if (typeof updateProgress === "function") updateProgress();
}

function formatAppNo(num) {
  const n = Math.max(0, Number(num) || 0);
  return String(n).padStart(3, "0");
}

function renderApplicationBadges(lastNum, syncInput = true) {
  const safeLast = Math.max(0, Number(lastNum) || 0);
  const lastFormatted = `PKS-2027-${formatAppNo(safeLast)}`;
  const nextFormatted = `PKS-2027-${formatAppNo(safeLast + 1)}`;

  const currentBadge = document.getElementById("currentAppNoBadge");
  const nextBadge = document.getElementById("nextAppNoBadge");
  const appNoInput = document.getElementById("q5_hh_no");

  if (currentBadge) currentBadge.textContent = lastFormatted;
  if (nextBadge) nextBadge.textContent = nextFormatted;
  if (appNoInput && syncInput) {
    appNoInput.value = nextFormatted;
  }
}

async function loadApplicationNumbers() {
  let cachedLast = 0;
  try {
    cachedLast = Number(localStorage.getItem(APP_COUNTER_STORAGE_KEY) || "0") || 0;
  } catch (err) {
    cachedLast = 0;
  }
  renderApplicationBadges(cachedLast, true);

  try {
    const res = await fetch(`${APPS_SCRIPT_URL}?action=getNextNo`, { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    if (data && typeof data.lastNo !== "undefined") {
      const serverLast = Math.max(0, Number(data.lastNo) || 0);
      try {
        localStorage.setItem(APP_COUNTER_STORAGE_KEY, String(serverLast));
      } catch (err) {
        // Ignore storage errors
      }
      renderApplicationBadges(serverLast, true);
    }
  } catch (err) {
    // Fallback to cached counter if offline
  }
}

function showStep(stepNumber) {
  const target = Math.max(1, Math.min(TOTAL_STEPS, Number(stepNumber) || 1));
  currentStep = target;

  document.querySelectorAll(".section-card[data-step]").forEach((card) => {
    const cardStep = Number(card.getAttribute("data-step"));
    card.classList.toggle("d-none", cardStep !== currentStep);
  });

  document.querySelectorAll(".step-pill-btn[data-goto-step]").forEach((btn) => {
    const btnStep = Number(btn.getAttribute("data-goto-step"));
    btn.classList.toggle("active", btnStep === currentStep);
  });

  const stepLabel = document.getElementById("stepBadgeLabel");
  if (stepLabel) {
    stepLabel.textContent = `කොටස ${String(currentStep).padStart(2, "0")} / ${String(TOTAL_STEPS).padStart(2, "0")}`;
  }

  const prevBtn = document.getElementById("prevStepBtn");
  const nextBtn = document.getElementById("nextStepBtn");
  const submitBtn = document.getElementById("submitBtn");
  const finalFooter = document.getElementById("finalSubmitSection");

  if (prevBtn) prevBtn.classList.toggle("d-none", currentStep === 1);
  if (nextBtn) nextBtn.classList.toggle("d-none", currentStep === TOTAL_STEPS);
  if (submitBtn) submitBtn.classList.toggle("d-none", currentStep !== TOTAL_STEPS);
  if (finalFooter) finalFooter.classList.toggle("d-none", currentStep !== TOTAL_STEPS);

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function validateCurrentStep() {
  if (currentStep === 1) {
    const dsdEl = document.getElementById("q2_dsd");
    const gndEl = document.getElementById("q3_gnd");
    const dsd = dsdEl ? dsdEl.value.trim() : "";
    const gnd = gndEl ? gndEl.value.trim() : "";

    if (!dsd || !gnd) {
      showNavAlert(
        "warning",
        "ඊළඟ කොටසට යාමට පෙර අනිවාර්ය (*) තොරතුරු (ප්‍රාදේශීය ලේකම් කොට්ඨාසය සහ ග්‍රාම නිලධාරී වසම) තෝරන්න."
      );
      return false;
    }
  }

  if (currentStep === 2) {
    const fullNameEl = document.getElementById("hh_full_name");
    const fullName = fullNameEl ? fullNameEl.value.trim() : "";

    if (fullNameEl && !fullName) {
      showNavAlert(
        "warning",
        "ඊළඟ කොටසට යාමට පෙර අනිවාර්ය (*) තොරතුර (01. සම්පූර්ණ නම) ඇතුළත් කරන්න."
      );
      return false;
    }

    const nicEl = document.getElementById("hh_nic");
    if (nicEl && nicEl.value.trim()) {
      const normalizedNic = normalizeNic(nicEl.value);
      if (getKnownNics().includes(normalizedNic)) {
        showNavAlert(
          "warning",
          `මෙම ජා.හැ. අංකය (${normalizedNic}) දැනටමත් ඇතුළත් කර ඇත. සමාන NIC අංකයක් ඇතුළත් කළ නොහැක.`
        );
        return false;
      }
      if (!isValidSriLankanNicFormat(normalizedNic)) {
        showNavAlert(
          "warning",
          "කරුණාකර නිවැරදි ජා.හැ. අංකයක් (NIC) ඇතුළත් කරන්න (උදා: 851234567V හෝ 198512304567)."
        );
        return false;
      }
    }
  }

  hideNavAlert();
  return true;
}

function showNavAlert(type, message) {
  const alertEl = document.getElementById("navAlertBox");
  if (!alertEl) return;
  alertEl.className = `alert alert-${type} mt-3 fw-semibold`;
  alertEl.textContent = message;
  alertEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function hideNavAlert() {
  const alertEl = document.getElementById("navAlertBox");
  if (!alertEl) return;
  alertEl.className = "alert d-none";
  alertEl.textContent = "";
}

// Section 02 Logic
function normalizeNic(raw) {
  return String(raw || "").trim().toUpperCase().replace(/\s+/g, "");
}

function isValidSriLankanNicFormat(nic) {
  if (!nic) return true;
  const oldNicRegex = /^[0-9]{9}[VX]$/;
  const newNicRegex = /^[0-9]{12}$/;
  return oldNicRegex.test(nic) || newNicRegex.test(nic);
}

function getKnownNics() {
  try {
    const raw = localStorage.getItem(SUBMITTED_NICS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(normalizeNic) : [];
  } catch (err) {
    return [];
  }
}

function registerSubmittedNic(nicValue) {
  const normalized = normalizeNic(nicValue);
  if (!normalized || !isValidSriLankanNicFormat(normalized)) return;

  const existing = getKnownNics();
  if (!existing.includes(normalized)) {
    existing.push(normalized);
    try {
      localStorage.setItem(SUBMITTED_NICS_STORAGE_KEY, JSON.stringify(existing));
    } catch (err) {
      // Ignore storage quota errors
    }
  }
}

function setNicFeedback(message, isError = true) {
  const feedbackEl = document.getElementById("hhNicFeedback");
  const nicInput = document.getElementById("hh_nic");
  if (!feedbackEl || !nicInput) return;

  if (!message) {
    feedbackEl.textContent = "";
    feedbackEl.classList.add("d-none");
    nicInput.classList.remove("is-invalid");
    return;
  }

  feedbackEl.textContent = message;
  feedbackEl.classList.toggle("text-danger", isError);
  feedbackEl.classList.toggle("text-success", !isError);
  feedbackEl.classList.remove("d-none");
  nicInput.classList.toggle("is-invalid", isError);
}

function handleNicLiveInput() {
  const nicInput = document.getElementById("hh_nic");
  if (!nicInput) return;

  const cleaned = normalizeNic(nicInput.value);
  nicInput.value = cleaned;

  if (!cleaned) {
    lastValidNicValue = "";
    setNicFeedback("");
    return;
  }

  const knownNics = getKnownNics();
  if (knownNics.includes(cleaned)) {
    nicInput.value = lastValidNicValue;
    setNicFeedback(
      `මෙම ජා.හැ. අංකය (${cleaned}) දැනටමත් ඇතුළත් කර ඇත. සමාන NIC අංකයක් නැවත ඇතුළත් කළ නොහැක!`,
      true
    );
    return;
  }

  if (!isValidSriLankanNicFormat(cleaned)) {
    if (cleaned.length > 12) {
      nicInput.value = lastValidNicValue;
      setNicFeedback("NIC අංකය අකුරු/ඉලක්කම් 12කට සීමා වේ.", true);
      return;
    }
    setNicFeedback(
      "නිවැරදි NIC ආකෘතිය ඇතුළත් කරන්න (උදා: 851234567V හෝ 198512304567).",
      true
    );
    return;
  }

  lastValidNicValue = cleaned;
  setNicFeedback("NIC අංකය නිවැරදියි.", false);
}

function calculateAgeFor2027() {
  const dobInput = document.getElementById("hh_dob");
  const ageInput = document.getElementById("hh_age_2027");
  if (!dobInput || !ageInput || !dobInput.value) return;

  const parts = dobInput.value.split("-");
  if (parts.length !== 3) return;

  const birthYear = Number(parts[0]);
  const birthMonth = Number(parts[1]);
  const birthDay = Number(parts[2]);

  if (!birthYear || birthYear > 2027) {
    ageInput.value = "";
    return;
  }

  let ageIn2027 = 2027 - birthYear;
  if (birthMonth > 12 || (birthMonth === 12 && birthDay > 31)) {
    ageIn2027 -= 1;
  }

  ageInput.value = String(Math.max(0, ageIn2027));
  if (typeof updateProgress === "function") updateProgress();
}

function updateFamilyMembersCardSummary() {
  const inputs = document.querySelectorAll(".hh-member-count-input");
  let sum = 0;

  inputs.forEach((input) => {
    const digitsOnly = String(input.value || "").replace(/[^0-9]/g, "");
    if (input.value !== digitsOnly) {
      input.value = digitsOnly;
    }
    sum += Number(digitsOnly || 0);
  });

  const previewEl = document.getElementById("hhTotalMembersPreview");
  if (previewEl) {
    previewEl.textContent = `මුළු එකතුව: ${sum}`;
  }
}

function toggleSection01Conditionals() {
  const trainingSelect = document.getElementById("hh_training_status");
  const trainingWrap = document.getElementById("hh_training_details_wrap");
  if (trainingSelect && trainingWrap) {
    trainingWrap.classList.toggle("d-none", trainingSelect.value !== "ඇත");
  }

  const licenseSelect = document.getElementById("hh_license_status");
  const licenseWrap = document.getElementById("hh_license_type_wrap");
  if (licenseSelect && licenseWrap) {
    licenseWrap.classList.toggle("d-none", licenseSelect.value !== "ඇත");
  }

  if (typeof updateProgress === "function") updateProgress();
}

function initSection01PersonalDetails() {
  const nicInput = document.getElementById("hh_nic");
  if (nicInput) {
    nicInput.addEventListener("input", handleNicLiveInput);
    nicInput.addEventListener("blur", handleNicLiveInput);
  }

  const dobInput = document.getElementById("hh_dob");
  if (dobInput) {
    dobInput.addEventListener("change", calculateAgeFor2027);
    dobInput.addEventListener("input", calculateAgeFor2027);
  }

  document.querySelectorAll(".hh-member-count-input").forEach((input) => {
    input.addEventListener("input", () => {
      updateFamilyMembersCardSummary();
      if (typeof updateProgress === "function") updateProgress();
    });
  });

  toggleSection01Conditionals();
  updateFamilyMembersCardSummary();
}

// Section 03 Logic
function toggleSection03Children() {
  const attendingSelect = document.getElementById("ch_school_attending");
  const schoolPanel =
    document.getElementById("ch_school_children_wrap") ||
    document.getElementById("schoolChildrenWrap");
  const container = document.getElementById("schoolChildrenContainer");

  if (attendingSelect) {
    const isYes = attendingSelect.value === "ඔව්";
    if (schoolPanel) {
      schoolPanel.classList.toggle("d-none", !isYes);
    }
    if (isYes && container && container.querySelectorAll(".dynamic-card").length === 0) {
      addSchoolChildCard(false);
    }
  }

  const notAttendingSelect = document.getElementById("ch_not_attending");
  const notAttendingReasonWrap =
    document.getElementById("ch_not_attending_reason_wrap") ||
    document.getElementById("q21_reason_wrap") ||
    document.getElementById("notAttendingReasonWrap");
  if (notAttendingSelect && notAttendingReasonWrap) {
    notAttendingReasonWrap.classList.toggle("d-none", notAttendingSelect.value !== "ඇත");
  }

  const underweightSelect = document.getElementById("ch_underweight");
  const underweightReasonWrap =
    document.getElementById("ch_underweight_reason_wrap") ||
    document.getElementById("q23_reason_wrap") ||
    document.getElementById("underweightReasonWrap");
  if (underweightSelect && underweightReasonWrap) {
    underweightReasonWrap.classList.toggle("d-none", underweightSelect.value !== "ඇත");
  }

  if (typeof updateProgress === "function") updateProgress();
}

function addSchoolChildCard(showRemove = true) {
  const containerId = "schoolChildrenContainer";
  const container = document.getElementById(containerId);
  if (!container) return;

  const prefix = "පාසල් යන දරුවා";
  const count = container.querySelectorAll(".dynamic-card").length + 1;

  const card = createCardElement(
    "school_child",
    `${prefix} #${count}`,
    showRemove,
    containerId,
    prefix,
    `
      <div class="row g-3">
        <div class="col-md-3">
          <label class="form-label">පාසල් යන දරුවාගේ නම</label>
          <input type="text" class="form-control" data-field="child_name" placeholder="දරුවාගේ නම" />
        </div>
        <div class="col-md-3">
          <label class="form-label">පාසලේ නම</label>
          <input type="text" class="form-control" data-field="school_name" placeholder="පාසලේ නම" />
        </div>
        <div class="col-md-3">
          <label class="form-label">ශ්‍රේණිය</label>
          <input type="text" class="form-control" data-field="grade" placeholder="උදා: 8 ශ්‍රේණිය" />
        </div>
        <div class="col-md-3">
          <label class="form-label">උපන් දිනය</label>
          <input type="date" class="form-control" data-field="dob" />
        </div>
      </div>
    `
  );

  appendCard(containerId, card);
}

function initSection03Children() {
  bindIfExists("ch_school_attending", "change", toggleSection03Children);
  bindIfExists("ch_not_attending", "change", toggleSection03Children);
  bindIfExists("ch_underweight", "change", toggleSection03Children);
  bindIfExists("addSchoolChildBtn", "click", () => addSchoolChildCard(true));

  toggleSection03Children();
}

// Section 04 (ඉඩම්) Logic
function toggleSection04Land() {
  const statusSelect = document.getElementById("q20_land_ownership_status");
  const cardsWrap = document.getElementById("land_cards_wrap");
  const container = document.getElementById("landsContainer");

  if (statusSelect) {
    const hasLand = statusSelect.value === "ඔව්";
    if (cardsWrap) {
      cardsWrap.classList.toggle("d-none", !hasLand);
    }
    if (hasLand && container && container.querySelectorAll(".dynamic-card").length === 0) {
      addLandCard(false);
    }
  }

  toggleSection04OtherInputs();
  if (typeof updateProgress === "function") updateProgress();
}

function toggleLandCropInputs(selectEl) {
  const card = selectEl ? selectEl.closest(".dynamic-card") : null;
  if (!card) return;

  const cultivatedSelect = card.querySelector('[data-field="cultivated_status"]');
  const cropsPanel = card.querySelector(".land-crops-panel");
  const isCultivated = cultivatedSelect && cultivatedSelect.value === "ඇත";

  if (cropsPanel) {
    cropsPanel.classList.toggle("d-none", !isCultivated);
  }

  toggleLandOtherCropInput(card);
  if (typeof updateProgress === "function") updateProgress();
}

function toggleLandOtherCropInput(cardOrEl) {
  const card = cardOrEl && cardOrEl.classList
    ? (cardOrEl.classList.contains("dynamic-card") ? cardOrEl : cardOrEl.closest(".dynamic-card"))
    : null;
  if (!card) return;

  const otherChk = card.querySelector(".land-crop-other-chk");
  const otherWrap = card.querySelector(".land-crop-other-wrap");
  if (otherChk && otherWrap) {
    otherWrap.classList.toggle("d-none", !otherChk.checked);
  }
  if (typeof updateProgress === "function") updateProgress();
}

function toggleSection04OtherInputs() {
  const livestockOtherChk = document.getElementById("livestock_other_chk");
  const livestockOtherWrap = document.getElementById("q27_livestock_other_wrap");
  if (livestockOtherChk && livestockOtherWrap) {
    livestockOtherWrap.classList.toggle("d-none", !livestockOtherChk.checked);
  }
}

function initSection04Land() {
  bindIfExists("q20_land_ownership_status", "change", toggleSection04Land);
  bindIfExists("livestock_other_chk", "change", toggleSection04OtherInputs);
  toggleSection04Land();
}
function toggleConditional(selectId, targetId) {
  const selectEl = document.getElementById(selectId);
  const targetEl = document.getElementById(targetId);
  if (!selectEl || !targetEl) return;

  const val = selectEl.value;
  const shouldShow =
    val === "ඔව්" ||
    val === "ඇත" ||
    val === "දුරකථන ඇත" ||
    val === "වාහන ඇත";

  targetEl.classList.toggle("d-none", !shouldShow);

  if (shouldShow) {
    ensureCardWhenOpened(targetId);
  }

  updateProgress();
}

function ensureCardWhenOpened(targetId) {
  const map = {
    land_cards_wrap: ["landsContainer", () => addLandCard(false)],
    livestock_wrap: ["livestockContainer", () => addLivestockCard(false)],
    vehicles_wrap: ["vehiclesContainer", () => addVehicleCard(false)],
    abroad_wrap: ["abroadContainer", () => addAbroadCard(false)],
    orphan_wrap: ["orphanContainer", () => addOrphanCard(false)],
    disability_wrap: ["disabilityContainer", () => addDisabilityCard(false)],
    addiction_wrap: ["addictionContainer", () => addAddictionCard(false)],
    welfare_wrap: ["welfareContainer", () => addWelfareCard(false)],
    loan_wrap: ["loanContainer", () => addLoanCard(false)]
  };

  const entry = map[targetId];
  if (!entry) return;
  const [containerId, creatorFn] = entry;
  const container = document.getElementById(containerId);
  if (container && container.querySelectorAll(".dynamic-card").length === 0) {
    creatorFn();
  }
}

function toggleEnergyOther() {
  const energyEl = document.getElementById("q38_energy");
  const otherWrap = document.getElementById("q38_other_wrap");
  if (!energyEl || !otherWrap) return;

  otherWrap.classList.toggle("d-none", energyEl.value !== "වෙනත්");
  updateProgress();
}

function renumberCards(containerId, labelPrefix) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const cards = container.querySelectorAll(".dynamic-card");
  cards.forEach((card, index) => {
    const titleEl = card.querySelector(".card-title-label");
    if (titleEl) {
      titleEl.textContent = `${labelPrefix} #${index + 1}`;
    }
  });
}

function removeCard(btn, containerId, labelPrefix) {
  const card = btn.closest(".dynamic-card");
  if (!card) return;
  card.remove();
  renumberCards(containerId, labelPrefix);
  updateProgress();
}

function createCardElement(cardType, titleText, showRemove, containerId, labelPrefix, bodyHtml) {
  const div = document.createElement("div");
  div.className = "dynamic-card";
  div.dataset.cardType = cardType;

  const removeBtnHtml = showRemove
    ? `<button type="button" class="btn btn-sm btn-remove-item" onclick="removeCard(this, '${containerId}', '${labelPrefix}')">ඉවත් කරන්න</button>`
    : "";

  div.innerHTML = `
    <div class="dynamic-card-top">
      <span class="card-title-label">${titleText}</span>
      ${removeBtnHtml}
    </div>
    ${bodyHtml}
  `;
  return div;
}

function appendCard(containerId, cardEl) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.appendChild(cardEl);
  bindProgressListeners(cardEl);
  updateProgress();
}

function addLandCard(showRemove = true) {
  const containerId = "landsContainer";
  const container = document.getElementById(containerId);
  if (!container) return;
  const prefix = "ඉඩම";
  const count = container.querySelectorAll(".dynamic-card").length + 1;
  const uid = `land_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  const crops = [
    "වී", "රබර්", "තේ", "පොල්", "ගම්මිරිස්", "කුරුඳු", "කෝපි", "කොකෝවා",
    "එළවළු", "පලතුරු", "ධාන්‍ය වර්ග", "කහ", "ඉඟුරු", "බඩ ඉරිඟු", "රටකජු", "අඹ"
  ];

  const cropCheckboxesHtml = crops
    .map(
      (crop, idx) => `
        <div class="col-6 col-md-3">
          <div class="form-check">
            <input class="form-check-input" type="checkbox" id="${uid}_crop_${idx}" data-field="crops" value="${crop}" />
            <label class="form-check-label" for="${uid}_crop_${idx}">${crop}</label>
          </div>
        </div>
      `
    )
    .join("");

  const card = createCardElement(
    "land",
    `${prefix} #${count}`,
    showRemove,
    containerId,
    prefix,
    `
      <div class="row g-3 mb-3">
        <div class="col-md-6">
          <label class="form-label">21. ඉඩමේ ප්‍රමාණය</label>
          <select class="form-select" data-field="land_size_band">
            <option value="">තෝරන්න...</option>
            <option value="අක්කර 1/4 ට අඩුයි">අක්කර 1/4 ට අඩුයි</option>
            <option value="අක්කර 1/2 - 1 අතර">අක්කර 1/2 - 1 අතර</option>
            <option value="අක්කර 2 - 3 අතර">අක්කර 2 - 3 අතර</option>
            <option value="අක්කර 3 - 5 ට වැඩියි">අක්කර 3 - 5 ට වැඩියි</option>
          </select>
        </div>
        <div class="col-md-6">
          <label class="form-label">22. ඉඩම් අයිතිකරුගේ නම</label>
          <input type="text" class="form-control" data-field="owner_name" placeholder="ඉඩම් අයිතිකරුගේ නම" />
        </div>
        <div class="col-md-6">
          <label class="form-label">23. බලපත්‍ර / ඔප්පු අංකය</label>
          <input type="text" class="form-control" data-field="deed_or_permit_no" placeholder="බලපත්‍ර / ඔප්පු අංකය" />
        </div>
        <div class="col-md-6">
          <label class="form-label">24. ඉඩමේ ප්‍රමාණය (අක්කර / රූඩ් / පර්චස්)</label>
          <input type="text" class="form-control" data-field="land_extent_details" placeholder="උදා: අක්කර 1 රූඩ් 2 පර්චස් 10" />
        </div>
      </div>

      <div class="sub-panel mb-0 bg-white">
        <div class="row g-3 align-items-end">
          <div class="col-md-4">
            <label class="form-label">25. ඉඩමේ වගාවන් (වගා කර ඇතිද?)</label>
            <select class="form-select" data-field="cultivated_status" onchange="toggleLandCropInputs(this)">
              <option value="">තෝරන්න...</option>
              <option value="ඇත">ඇත</option>
              <option value="නැත">නැත</option>
            </select>
          </div>
        </div>

        <div class="land-crops-panel d-none mt-3">
          <label class="form-label d-block">වගා කර ඇති බෝග තෝරන්න:</label>
          <div class="row g-2">
            ${cropCheckboxesHtml}
            <div class="col-6 col-md-3">
              <div class="form-check">
                <input class="form-check-input land-crop-other-chk" type="checkbox" id="${uid}_crop_other" data-field="crops" value="වෙනත්" onchange="toggleLandOtherCropInput(this)" />
                <label class="form-check-label" for="${uid}_crop_other">වෙනත්</label>
              </div>
            </div>
          </div>
          <div class="land-crop-other-wrap d-none mt-2">
            <label class="form-label">වෙනත් වගා (සඳහන් කරන්න)</label>
            <input type="text" class="form-control" data-field="other_crop_text" placeholder="වෙනත් බෝග වර්ග" />
          </div>
        </div>
      </div>
    `
  );
  appendCard(containerId, card);
}

function addLivestockCard(showRemove = true) {
  const containerId = "livestockContainer";
  const container = document.getElementById(containerId);
  if (!container) return;
  const prefix = "සත්ව වර්ගය";
  const count = container.querySelectorAll(".dynamic-card").length + 1;

  const card = createCardElement(
    "livestock",
    `${prefix} #${count}`,
    showRemove,
    containerId,
    prefix,
    `
      <div class="row g-3">
        <div class="col-md-3">
          <label class="form-label">සතුන් වර්ගය</label>
          <input type="text" class="form-control" data-field="animal_type" placeholder="එළුවන්, කුකුළන්, ගවයින්" />
        </div>
        <div class="col-md-3">
          <label class="form-label">සතුන් ප්‍රමාණය</label>
          <input type="number" class="form-control" data-field="animal_count" min="0" placeholder="0" />
        </div>
        <div class="col-md-3">
          <label class="form-label">මාසික ආදායම (රු.)</label>
          <input type="text" class="form-control" data-field="monthly_income" placeholder="රු." />
        </div>
        <div class="col-md-3">
          <label class="form-label">අවශ්‍යතා / ගැටලු</label>
          <input type="text" class="form-control" data-field="needs" placeholder="කූඩු / ආහාර / එන්නත්" />
        </div>
      </div>
    `
  );
  appendCard(containerId, card);
}

function addVehicleCard(showRemove = true) {
  const containerId = "vehiclesContainer";
  const container = document.getElementById(containerId);
  if (!container) return;
  const prefix = "වාහනය";
  const count = container.querySelectorAll(".dynamic-card").length + 1;

  const card = createCardElement(
    "vehicle",
    `${prefix} #${count}`,
    showRemove,
    containerId,
    prefix,
    `
      <div class="row g-3">
        <div class="col-md-4">
          <label class="form-label">වාහන වර්ගය</label>
          <input type="text" class="form-control" data-field="vehicle_type" placeholder="යතුරුපැදිය / ත්‍රිරෝද රථය" />
        </div>
        <div class="col-md-4">
          <label class="form-label">අයිතිකරු</label>
          <input type="text" class="form-control" data-field="owner" placeholder="අයිතිකරුගේ නම" />
        </div>
        <div class="col-md-4">
          <label class="form-label">වාහන අංකය</label>
          <input type="text" class="form-control" data-field="vehicle_no" placeholder="WP ABC-1234" />
        </div>
      </div>
    `
  );
  appendCard(containerId, card);
}

function addAbroadCard(showRemove = true) {
  const containerId = "abroadContainer";
  const container = document.getElementById(containerId);
  if (!container) return;
  const prefix = "විදෙස්ගත වූ තැනැත්තා";
  const count = container.querySelectorAll(".dynamic-card").length + 1;

  const card = createCardElement(
    "abroad",
    `${prefix} #${count}`,
    showRemove,
    containerId,
    prefix,
    `
      <div class="row g-3">
        <div class="col-md-4">
          <label class="form-label">නම</label>
          <input type="text" class="form-control" data-field="name" placeholder="නම" />
        </div>
        <div class="col-md-4">
          <label class="form-label">විදෙස්ගත වූ රට</label>
          <input type="text" class="form-control" data-field="country" placeholder="රටේ නම" />
        </div>
        <div class="col-md-4">
          <label class="form-label">වර්ෂය</label>
          <input type="text" class="form-control" data-field="year" placeholder="2023" />
        </div>
      </div>
    `
  );
  appendCard(containerId, card);
}

function addOrphanCard(showRemove = true) {
  const containerId = "orphanContainer";
  const container = document.getElementById(containerId);
  if (!container) return;
  const prefix = "දරුවා";
  const count = container.querySelectorAll(".dynamic-card").length + 1;

  const card = createCardElement(
    "orphan",
    `${prefix} #${count}`,
    showRemove,
    containerId,
    prefix,
    `
      <div class="row g-3">
        <div class="col-md-6">
          <label class="form-label">නම</label>
          <input type="text" class="form-control" data-field="name" placeholder="දරුවාගේ නම" />
        </div>
        <div class="col-md-6">
          <label class="form-label">උපන් දිනය</label>
          <input type="date" class="form-control" data-field="dob" />
        </div>
      </div>
    `
  );
  appendCard(containerId, card);
}

function addDisabilityCard(showRemove = true) {
  const containerId = "disabilityContainer";
  const container = document.getElementById(containerId);
  if (!container) return;
  const prefix = "පුද්ගලයා";
  const count = container.querySelectorAll(".dynamic-card").length + 1;

  const card = createCardElement(
    "disability",
    `${prefix} #${count}`,
    showRemove,
    containerId,
    prefix,
    `
      <div class="row g-3">
        <div class="col-md-3">
          <label class="form-label">ආබාධයේ ස්වභාවය</label>
          <select class="form-select" data-field="disability_type">
            <option value="">තෝරන්න...</option>
            <option value="දෘශ්‍යාබාධ">දෘශ්‍යාබාධ</option>
            <option value="කථනාබාධ">කථනාබාධ</option>
            <option value="ශ්‍රවණාබාධ">ශ්‍රවණාබාධ</option>
            <option value="කථන හා ශ්‍රවණ">කථන හා ශ්‍රවණ</option>
            <option value="අත්වල ආබාධ">අත්වල ආබාධ</option>
            <option value="පාදවල ආබාධ">පාදවල ආබාධ</option>
            <option value="මන්ද මානසික / මන්ද බුද්ධික">මන්ද මානසික / මන්ද බුද්ධික</option>
            <option value="වැඩීමේ දුර්වලතා">වැඩීමේ දුර්වලතා</option>
            <option value="බහු ආබාධ">බහු ආබාධ</option>
            <option value="වෙනත්">වෙනත්</option>
          </select>
        </div>
        <div class="col-md-3">
          <label class="form-label">නම</label>
          <input type="text" class="form-control" data-field="name" placeholder="නම" />
        </div>
        <div class="col-md-3">
          <label class="form-label">උපන් දිනය</label>
          <input type="date" class="form-control" data-field="dob" />
        </div>
        <div class="col-md-3">
          <label class="form-label">ජා.හැ. අංකය</label>
          <input type="text" class="form-control" data-field="nic" placeholder="NIC අංකය" />
        </div>
      </div>
    `
  );
  appendCard(containerId, card);
}

function addAddictionCard(showRemove = true) {
  const containerId = "addictionContainer";
  const container = document.getElementById(containerId);
  if (!container) return;
  const prefix = "පුද්ගලයා";
  const count = container.querySelectorAll(".dynamic-card").length + 1;

  const card = createCardElement(
    "addiction",
    `${prefix} #${count}`,
    showRemove,
    containerId,
    prefix,
    `
      <div class="row g-3">
        <div class="col-md-4">
          <label class="form-label">නම</label>
          <input type="text" class="form-control" data-field="name" placeholder="නම" />
        </div>
        <div class="col-md-4">
          <label class="form-label">උපන් දිනය</label>
          <input type="date" class="form-control" data-field="dob" />
        </div>
        <div class="col-md-4">
          <label class="form-label">ජා.හැ. අංකය</label>
          <input type="text" class="form-control" data-field="nic" placeholder="NIC අංකය" />
        </div>
      </div>
    `
  );
  appendCard(containerId, card);
}

function addWelfareCard(showRemove = true) {
  const containerId = "welfareContainer";
  const container = document.getElementById(containerId);
  if (!container) return;
  const prefix = "ලාභියා";
  const count = container.querySelectorAll(".dynamic-card").length + 1;

  const card = createCardElement(
    "welfare",
    `${prefix} #${count}`,
    showRemove,
    containerId,
    prefix,
    `
      <div class="row g-3">
        <div class="col-md-3">
          <label class="form-label">දීමනා වර්ගය</label>
          <select class="form-select" data-field="allowance_type">
            <option value="">තෝරන්න...</option>
            <option value="අස්වැසුම">අස්වැසුම</option>
            <option value="මහජන ආධාර">මහජන ආධාර</option>
            <option value="වැඩිහිටි දීමනා">වැඩිහිටි දීමනා</option>
            <option value="ආබාධිත දීමනා">ආබාධිත දීමනා</option>
            <option value="වකුගඩු ආධාර">වකුගඩු ආධාර</option>
            <option value="පිළිකා ආධාර">පිළිකා ආධාර</option>
            <option value="තැලසීමියා ආධාර">තැලසීමියා ආධාර</option>
            <option value="ළඳරු">ළඳරු</option>
            <option value="වෙනත්">වෙනත්</option>
          </select>
        </div>
        <div class="col-md-3">
          <label class="form-label">නම</label>
          <input type="text" class="form-control" data-field="name" placeholder="නම" />
        </div>
        <div class="col-md-3">
          <label class="form-label">උපන් දිනය</label>
          <input type="date" class="form-control" data-field="dob" />
        </div>
        <div class="col-md-3">
          <label class="form-label">ජා.හැ. අංකය</label>
          <input type="text" class="form-control" data-field="nic" placeholder="NIC අංකය" />
        </div>
      </div>
    `
  );
  appendCard(containerId, card);
}

function addBankCard(showRemove = true) {
  const containerId = "bankContainer";
  const container = document.getElementById(containerId);
  if (!container) return;
  const prefix = "බැංකු ගිණුම";
  const count = container.querySelectorAll(".dynamic-card").length + 1;

  const card = createCardElement(
    "bank",
    `${prefix} #${count}`,
    showRemove,
    containerId,
    prefix,
    `
      <div class="row g-3">
        <div class="col-md-4">
          <label class="form-label">බැංකුවේ නම</label>
          <input type="text" class="form-control" data-field="bank_name" placeholder="බැංකුවේ නම" />
        </div>
        <div class="col-md-4">
          <label class="form-label">බැංකු ගිණුම් අංකය (කැමති නම්)</label>
          <input type="text" class="form-control" data-field="account_no" placeholder="ගිණුම් අංකය (විකල්ප)" />
        </div>
        <div class="col-md-4">
          <label class="form-label">බැංකු ශාඛාව</label>
          <input type="text" class="form-control" data-field="branch" placeholder="ශාඛාව" />
        </div>
      </div>
    `
  );
  appendCard(containerId, card);
}

function addLoanCard(showRemove = true) {
  const containerId = "loanContainer";
  const container = document.getElementById(containerId);
  if (!container) return;
  const prefix = "ණය පහසුකම";
  const count = container.querySelectorAll(".dynamic-card").length + 1;

  const card = createCardElement(
    "loan",
    `${prefix} #${count}`,
    showRemove,
    containerId,
    prefix,
    `
      <div class="row g-3">
        <div class="col-md-3">
          <label class="form-label">ණය මූලාශ්‍රය</label>
          <select class="form-select" data-field="loan_source">
            <option value="">තෝරන්න...</option>
            <option value="රාජ්‍ය / පෞද්ගලික බැංකු">රාජ්‍ය / පෞද්ගලික බැංකු</option>
            <option value="සමෘද්ධි / ග්‍රාමීය සංවර්ධන සමිති">සමෘද්ධි / ග්‍රාමීය සංවර්ධන සමිති</option>
            <option value="ක්ෂුද්‍ර මූල්‍ය ආයතන (Microfinance)">ක්ෂුද්‍ර මූල්‍ය ආයතන (Microfinance)</option>
            <option value="උකස් / පෞද්ගලික ණයකරුවන්">උකස් / පෞද්ගලික ණයකරුවන්</option>
          </select>
        </div>
        <div class="col-md-3">
          <label class="form-label">ගෙවීමට ඇති මුළු ණය මුදල් ප්‍රමාණය</label>
          <select class="form-select" data-field="total_loan_amount">
            <option value="">තෝරන්න...</option>
            <option value="රු. 50,000 ට අඩු">රු. 50,000 ට අඩු</option>
            <option value="රු. 50,000 - 150,000 අතර">රු. 50,000 - 150,000 අතර</option>
            <option value="රු. 150,000 - 500,000 අතර">රු. 150,000 - 500,000 අතර</option>
            <option value="රු. 500,000 ට වැඩි">රු. 500,000 ට වැඩි</option>
          </select>
        </div>
        <div class="col-md-3">
          <label class="form-label">මාසික ණය වාරික ප්‍රමාණය</label>
          <input type="text" class="form-control" data-field="monthly_installment" placeholder="රු." />
        </div>
        <div class="col-md-3">
          <label class="form-label">ණය ගෙවීමේ පහසුව</label>
          <select class="form-select" data-field="repayment_ease">
            <option value="">තෝරන්න...</option>
            <option value="නියමිත පරිදි ගෙවයි">නියමිත පරිදි ගෙවයි</option>
            <option value="වාරික ගෙවීම අපහසුයි / හිඟ වී ඇත">වාරික ගෙවීම අපහසුයි / හිඟ වී ඇත</option>
          </select>
        </div>
      </div>
    `
  );
  appendCard(containerId, card);
}

function initDefaultCards() {
  addBankCard(false);
}

function bindIfExists(id, eventName, handler) {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener(eventName, handler);
  }
}

function bindButtonEvents() {
  bindIfExists("prevStepBtn", "click", () => {
    hideNavAlert();
    showStep(currentStep - 1);
  });

  bindIfExists("nextStepBtn", "click", () => {
    if (validateCurrentStep()) {
      showStep(currentStep + 1);
    }
  });

  document.querySelectorAll(".step-pill-btn[data-goto-step]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetStep = Number(btn.getAttribute("data-goto-step"));
      if (targetStep > currentStep && !validateCurrentStep()) return;
      showStep(targetStep);
    });
  });

  bindIfExists("saveSurveyorPrefsBtn", "click", () => saveSurveyorPrefs(true));
  bindIfExists("clearSurveyorPrefsBtn", "click", clearSurveyorPrefs);

  bindIfExists("addLandBtn", "click", () => addLandCard(true));
  bindIfExists("addLivestockBtn", "click", () => addLivestockCard(true));
  bindIfExists("addVehicleBtn", "click", () => addVehicleCard(true));
  bindIfExists("addAbroadBtn", "click", () => addAbroadCard(true));
  bindIfExists("addOrphanBtn", "click", () => addOrphanCard(true));
  bindIfExists("addDisabilityBtn", "click", () => addDisabilityCard(true));
  bindIfExists("addAddictionBtn", "click", () => addAddictionCard(true));
  bindIfExists("addWelfareBtn", "click", () => addWelfareCard(true));
  bindIfExists("addBankBtn", "click", () => addBankCard(true));
  bindIfExists("addLoanBtn", "click", () => addLoanCard(true));

  bindIfExists("surveyForm", "submit", handleFormSubmit);
  bindIfExists("resetFormBtn", "click", handleFormReset);
}

function bindProgressListeners(root) {
  if (!root) return;
  root.querySelectorAll("input, select, textarea").forEach((el) => {
    el.addEventListener("input", updateProgress);
    el.addEventListener("change", updateProgress);
  });
}

function updateProgress() {
  const keyIds = [
    "q2_dsd", "q3_gnd", "hh_full_name", "hh_nic", "hh_phone",
    "hh_ethnicity", "hh_religion", "hh_gender", "hh_dob", "hh_age_2027",
    "hh_marital_status", "hh_permanent_address", "hh_mem_male",
    "hh_mem_female", "hh_female_headed", "hh_education", "hh_job_sector",
    "hh_job_stability", "hh_training_status", "hh_license_status",
    "ch_school_attending", "ch_not_attending", "ch_underweight",
    "ch_malnourished", "ch_nutrition_aid", "q20_land_ownership_status",
    "q26_cultivated_extent", "q28_animal_count_by_type",
    "q29_gross_monthly_income", "q29a_home_garden_compost", "q29b_market_access"
  ];

  const existingIds = keyIds.filter((id) => document.getElementById(id) !== null);
  if (existingIds.length === 0) return;

  let filled = 0;
  existingIds.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.type === "checkbox") {
      if (el.checked) filled++;
    } else if (el.value && el.value.trim() !== "") {
      filled++;
    }
  });

  const pct = Math.round((filled / existingIds.length) * 100);
  const bar = document.getElementById("progressBar");
  const label = document.getElementById("progressLabel");
  if (bar) {
    bar.style.width = `${pct}%`;
    bar.setAttribute("aria-valuenow", String(pct));
  }
  if (label) {
    label.textContent = `සම්පූර්ණ කර ඇති ප්‍රමාණය: ${pct}%`;
  }
}

function collectCardData(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return [];
  const rows = [];

  container.querySelectorAll(".dynamic-card").forEach((card) => {
    const item = {};
    let hasValue = false;

    const fieldGroups = {};
    card.querySelectorAll("[data-field]").forEach((el) => {
      const key = el.getAttribute("data-field");
      if (!fieldGroups[key]) fieldGroups[key] = [];
      fieldGroups[key].push(el);
    });

    Object.keys(fieldGroups).forEach((key) => {
      const els = fieldGroups[key];
      if (els.length === 1 && els[0].type === "checkbox") {
        const val = els[0].checked ? els[0].value : "";
        item[key] = val;
        if (val !== "") hasValue = true;
      } else if (els[0].type === "checkbox") {
        const checkedVals = els.filter((cb) => cb.checked).map((cb) => cb.value);
        item[key] = checkedVals.join(", ");
        if (checkedVals.length > 0) hasValue = true;
      } else {
        const val = (els[0].value || "").trim();
        item[key] = val;
        if (val !== "") hasValue = true;
      }
    });

    if (hasValue) rows.push(item);
  });

  return rows;
}

function collectCheckboxGroup(name) {
  return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map((cb) => cb.value);
}

function buildPayload() {
  const form = document.getElementById("surveyForm");
  const data = {};

  if (form) {
    form.querySelectorAll("input[id], select[id], textarea[id]").forEach((el) => {
      if (el.type === "checkbox") {
        data[el.id] = el.checked ? "ඔව් (සහතික කර ඇත)" : "නැත";
      } else {
        data[el.id] = (el.value || "").trim();
      }
    });
  }

  const m = Number(data.hh_mem_male || 0);
  const f = Number(data.hh_mem_female || 0);
  const u18 = Number(data.hh_mem_under18 || 0);
  const o60 = Number(data.hh_mem_over60 || 0);
  data.hh_members_total_calc = m + f + u18 + o60;

  data.q27_livestock = collectCheckboxGroup("q27_livestock").join(", ");
  data.q43_disasters = collectCheckboxGroup("q43_disasters").join(", ");
  data.q43a_insurance = collectCheckboxGroup("q43a_insurance").join(", ");
  data.q09a_social = collectCheckboxGroup("q09a_social").join(", ");
  data.q09b_housing = collectCheckboxGroup("q09b_housing").join(", ");
  data.q09c_livelihood = collectCheckboxGroup("q09c_livelihood").join(", ");

  data.school_children_cards =
    data.ch_school_attending === "ඔව්" ? collectCardData("schoolChildrenContainer") : [];
  data.land_cards =
    data.q20_land_ownership_status === "ඔව්" ? collectCardData("landsContainer") : [];
  data.livestock_cards = data.q33_livestock_status === "ඇත" ? collectCardData("livestockContainer") : [];
  data.vehicle_cards = data.q42_vehicle_status === "වාහන ඇත" ? collectCardData("vehiclesContainer") : [];
  data.abroad_cards = data.q45_abroad_status === "ඔව්" ? collectCardData("abroadContainer") : [];
  data.orphan_cards = data.q46_orphan_status === "ඔව්" ? collectCardData("orphanContainer") : [];
  data.disability_cards = data.q47_disability_status === "ඔව්" ? collectCardData("disabilityContainer") : [];
  data.addiction_cards = data.q48_addiction_status === "ඔව්" ? collectCardData("addictionContainer") : [];
  data.welfare_cards = data.q49_welfare_status === "ඔව්" ? collectCardData("welfareContainer") : [];
  data.bank_cards = collectCardData("bankContainer");
  data.loan_cards = data.q52_loan_status === "ඔව්" ? collectCardData("loanContainer") : [];

  data.submitted_at = new Date().toISOString();
  return data;
}

function showStatus(type, message) {
  const box = document.getElementById("statusMessage");
  if (!box) return;
  box.className = `alert alert-${type === "success" ? "success" : "danger"} mt-3 fw-semibold`;
  box.textContent = message;
  box.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

async function handleFormSubmit(e) {
  e.preventDefault();
  hideNavAlert();

  const statusBox = document.getElementById("statusMessage");
  if (statusBox) {
    statusBox.className = "alert d-none";
    statusBox.textContent = "";
  }

  const dsdEl = document.getElementById("q2_dsd");
  const gndEl = document.getElementById("q3_gnd");
  const fullNameEl = document.getElementById("hh_full_name");
  const certifyEl = document.getElementById("certifyCheckbox");

  const dsd = dsdEl ? dsdEl.value.trim() : "";
  const gnd = gndEl ? gndEl.value.trim() : "";
  const fullName = fullNameEl ? fullNameEl.value.trim() : "";

  if (!dsd || !gnd) {
    showStep(1);
    showStatus("error", "කරුණාකර අනිවාර්ය (*) මූලික තොරතුරු (ප්‍රාදේශීය ලේකම් කොට්ඨාසය සහ ග්‍රාම නිලධාරී වසම) තෝරන්න.");
    return;
  }

  if (fullNameEl && !fullName) {
    showStep(2);
    showStatus("error", "කරුණාකර අනිවාර්ය (*) තොරතුර (01. සම්පූර්ණ නම) ඇතුළත් කරන්න.");
    return;
  }

  if (certifyEl && !certifyEl.checked) {
    showStep(9);
    showStatus("error", "දත්ත Submit කිරීමට පෙර \"ඉහත තොරතුරු නිවැරදි හා සත්‍ය බවට මා සහතික කරමි.\" යන්න තෝරන්න.");
    return;
  }

  const submitBtn = document.getElementById("submitBtn");
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "දත්ත යවමින් පවතී...";
  }

  try {
    const payload = buildPayload();
    await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });

    saveSurveyorPrefs(false);

    const nicEl = document.getElementById("hh_nic");
    if (nicEl && nicEl.value.trim()) {
      registerSubmittedNic(nicEl.value.trim());
    }

    let lastNo = Number(localStorage.getItem(APP_COUNTER_STORAGE_KEY) || "0") || 0;
    lastNo += 1;
    try {
      localStorage.setItem(APP_COUNTER_STORAGE_KEY, String(lastNo));
    } catch (err) {
      // Ignore storage errors
    }
    renderApplicationBadges(lastNo, true);

    showStatus(
      "success",
      `සාර්ථකයි! අයදුම්පත් අංකය PKS-2027-${formatAppNo(lastNo)} යටතේ දත්ත Google Sheet වෙත යොමු කරන ලදී. ඊළඟ අයදුම්පත: PKS-2027-${formatAppNo(lastNo + 1)}`
    );
  } catch (err) {
    showStatus("error", "දත්ත යැවීමේදී ගැටලුවක් ඇති විය. අන්තර්ජාල සම්බන්ධතාව පරීක්ෂා කර නැවත උත්සාහ කරන්න.");
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "දත්ත Submit කරන්න";
    }
  }
}

function handleFormReset() {
  if (!confirm("ෆෝරමයේ ඇතුළත් කළ දත්ත හිස් කිරීමට ඔබට විශ්වාසද? (සමීක්ෂක හා වසම් මූලික විස්තර Phone එකේ සුරැකී පවතී)")) return;

  const form = document.getElementById("surveyForm");
  if (form) form.reset();

  lastValidNicValue = "";
  setNicFeedback("");
  setDefaultValues();
  loadSurveyorPrefs();
  updateFamilyMembersCardSummary();
  toggleSection01Conditionals();
  toggleSection03Children();
  toggleSection04Land();

  const lastNo = Number(localStorage.getItem(APP_COUNTER_STORAGE_KEY) || "0") || 0;
  renderApplicationBadges(lastNo, true);

  CARD_CONTAINERS.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = "";
  });

  CONDITIONAL_WRAPS.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.classList.add("d-none");
  });

  initDefaultCards();
  hideNavAlert();

  const statusBox = document.getElementById("statusMessage");
  if (statusBox) {
    statusBox.className = "alert d-none";
    statusBox.textContent = "";
  }

  showStep(1);
  updateProgress();
}

window.addEventListener("DOMContentLoaded", () => {
  setDefaultValues();
  loadSurveyorPrefs();
  loadApplicationNumbers();
  initDefaultCards();
  initSection01PersonalDetails();
  initSection03Children();
  initSection04Land();
  bindButtonEvents();
  bindProgressListeners(document.getElementById("surveyForm"));
  showStep(1);
  updateProgress();
});
