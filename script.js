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
