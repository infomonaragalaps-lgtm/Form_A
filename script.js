const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbww2GIaQkDYozdMg-WOAXnPS8tDxJQWHqKwus3dmywcZDhrh0ZOBnBdExFHm32jOXEN/exec";

const TOTAL_STEPS = 9;
let currentStep = 1;

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
  "loan_wrap"
];

window.addEventListener("DOMContentLoaded", () => {
  const dateInput = document.getElementById("q6_date");
  if (dateInput && !dateInput.value) {
    dateInput.value = new Date().toISOString().split("T")[0];
  }

  initDefaultCards();
  bindButtonEvents();
  bindProgressListeners(document.getElementById("surveyForm"));
  showStep(1);
  updateProgress();
});

function showStep(stepNumber) {
  const target = Math.max(1, Math.min(TOTAL_STEPS, Number(stepNumber) || 1));
  currentStep = target;

  document.querySelectorAll(".section-card[data-step]").forEach((card) => {
    const cardStep = Number(card.getAttribute("data-step"));
    if (cardStep === currentStep) {
      card.classList.remove("d-none");
    } else {
      card.classList.add("d-none");
    }
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
  const finalFooter = document.getElementById("finalSubmitSection");

  if (prevBtn) {
    prevBtn.classList.toggle("d-none", currentStep === 1);
  }

  if (nextBtn) {
    nextBtn.classList.toggle("d-none", currentStep === TOTAL_STEPS);
  }

  if (finalFooter) {
    finalFooter.classList.toggle("d-none", currentStep !== TOTAL_STEPS);
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function validateCurrentStep() {
  if (currentStep === 1) {
    const dsd = document.getElementById("q2_dsd").value.trim();
    const gnd = document.getElementById("q3_gnd").value.trim();
    const headName = document.getElementById("q7_head_name").value.trim();
    const totalMembers = document.getElementById("q9_total_members").value.trim();

    if (!dsd || !gnd || !headName || !totalMembers) {
      showNavAlert(
        "warning",
        "ඊළඟ කොටසට යාමට පෙර අනිවාර්ය (*) තොරතුරු (02. ප්‍රා.ලේ. කොට්ඨාසය, 03. ග්‍රාම නිලධාරී වසම, 07. මූලිකයාගේ නම සහ 09. මුළු සාමාජික සංඛ්‍යාව) ඇතුළත් කරන්න."
      );
      return false;
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

  if (shouldShow) {
    targetEl.classList.remove("d-none");
  } else {
    targetEl.classList.add("d-none");
  }
  updateProgress();
}

function toggleEnergyOther() {
  const energyEl = document.getElementById("q38_energy");
  const otherWrap = document.getElementById("q38_other_wrap");
  if (!energyEl || !otherWrap) return;

  if (energyEl.value === "වෙනත්") {
    otherWrap.classList.remove("d-none");
  } else {
    otherWrap.classList.add("d-none");
  }
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

// 19. පාසල් යන දරුවන්ගේ Card
function addSchoolChildCard(showRemove = true) {
  const containerId = "schoolChildrenContainer";
  const prefix = "පාසල් යන දරුවා";
  const count = document.getElementById(containerId).querySelectorAll(".dynamic-card").length + 1;

  const card = createCardElement(
    "school_child",
    `${prefix} #${count}`,
    showRemove,
    containerId,
    prefix,
    `
      <div class="row g-3">
        <div class="col-md-4">
          <label class="form-label">දරුවාගේ නම</label>
          <input type="text" class="form-control" data-field="child_name" placeholder="නම" />
        </div>
        <div class="col-md-4">
          <label class="form-label">පාසලේ නම</label>
          <input type="text" class="form-control" data-field="school_name" placeholder="පාසල" />
        </div>
        <div class="col-md-4">
          <label class="form-label">ශ්‍රේණිය</label>
          <input type="text" class="form-control" data-field="grade" placeholder="උදා: 8 ශ්‍රේණිය" />
        </div>
      </div>
    `
  );
  appendCard(containerId, card);
}

// 24. ඉඩම් තොරතුරු Card (25 - 32 fields)
function addLandCard(showRemove = true) {
  const containerId = "landsContainer";
  const prefix = "ඉඩම";
  const count = document.getElementById(containerId).querySelectorAll(".dynamic-card").length + 1;

  const card = createCardElement(
    "land",
    `${prefix} #${count}`,
    showRemove,
    containerId,
    prefix,
    `
      <div class="row g-3 mb-2">
        <div class="col-md-3">
          <label class="form-label">25. ඉඩමේ වර්ගය</label>
          <select class="form-select" data-field="land_type">
            <option value="">තෝරන්න...</option>
            <option value="ගොඩ ඉඩම්">ගොඩ ඉඩම්</option>
            <option value="මඩ ඉඩම් / කුඹුරු">මඩ ඉඩම් / කුඹුරු</option>
            <option value="ගෙවතු ඉඩම">ගෙවතු ඉඩම</option>
            <option value="වෙනත්">වෙනත්</option>
          </select>
        </div>
        <div class="col-md-3">
          <label class="form-label">26. ඉඩමේ ප්‍රමාණය</label>
          <input type="text" class="form-control" data-field="land_size" placeholder="අක්කර / රූඩ් / පර්චස්" />
        </div>
        <div class="col-md-3">
          <label class="form-label">27. අයිතියේ ස්වභාවය</label>
          <select class="form-select" data-field="ownership">
            <option value="">තෝරන්න...</option>
            <option value="සින්නක්කර / ඔප්පු සහිත">සින්නක්කර / ඔප්පු සහිත</option>
            <option value="බලපත්‍ර / ජයභූමි / ස්වර්ණභූමි">බලපත්‍ර / ජයභූමි / ස්වර්ණභූමි</option>
            <option value="රජයේ ඉඩම් (අවසරයකින් තොර)">රජයේ ඉඩම් (අවසරයකින් තොර)</option>
            <option value="බදු / හවුල්">බදු / හවුල්</option>
          </select>
        </div>
        <div class="col-md-3">
          <label class="form-label">28. වගා කර ඇති බෝග</label>
          <input type="text" class="form-control" data-field="crops" placeholder="බෝග වර්ග" />
        </div>
      </div>
      <div class="row g-3">
        <div class="col-md-3">
          <label class="form-label">29. වගා නොකළ ප්‍රමාණය</label>
          <input type="text" class="form-control" data-field="uncultivated_extent" placeholder="ප්‍රමාණය" />
        </div>
        <div class="col-md-3">
          <label class="form-label">30. වගා නොකිරීමට හේතුව</label>
          <input type="text" class="form-control" data-field="uncultivated_reason" placeholder="හේතුව" />
        </div>
        <div class="col-md-3">
          <label class="form-label">31. ජල සම්පාදන පහසුකම්</label>
          <input type="text" class="form-control" data-field="irrigation" placeholder="ළිඳ / වැව / ඇළ / වැසි" />
        </div>
        <div class="col-md-3">
          <label class="form-label">32. මාසික ආදායම (රු.)</label>
          <input type="text" class="form-control" data-field="land_income" placeholder="රු." />
        </div>
      </div>
    `
  );
  appendCard(containerId, card);
}

// පශු සම්පත් Card
function addLivestockCard(showRemove = true) {
  const containerId = "livestockContainer";
  const prefix = "සත්ව වර්ගය";
  const count = document.getElementById(containerId).querySelectorAll(".dynamic-card").length + 1;

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
          <input type="text" class="form-control" data-field="animal_type" placeholder="උදා: එළුවන්, කුකුළන්, ගවයින්" />
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
          <input type="text" class="form-control" data-field="needs" placeholder="කූඩු / ආහාර / එන්නත් / ණය" />
        </div>
      </div>
    `
  );
  appendCard(containerId, card);
}

// වාහන තොරතුරු Card
function addVehicleCard(showRemove = true) {
  const containerId = "vehiclesContainer";
  const prefix = "වාහනය";
  const count = document.getElementById(containerId).querySelectorAll(".dynamic-card").length + 1;

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
          <input type="text" class="form-control" data-field="vehicle_type" placeholder="උදා: යතුරුපැදිය, ත්‍රිරෝද රථය, මෝටර් රථය" />
        </div>
        <div class="col-md-4">
          <label class="form-label">අයිතිකරු</label>
          <input type="text" class="form-control" data-field="owner" placeholder="අයිතිකරුගේ නම / සම්බන්ධතාව" />
        </div>
        <div class="col-md-4">
          <label class="form-label">වාහන අංකය</label>
          <input type="text" class="form-control" data-field="vehicle_no" placeholder="උදා: WP ABC-1234" />
        </div>
      </div>
    `
  );
  appendCard(containerId, card);
}

// 7.2 විදෙස්ගත වූවන් Card
function addAbroadCard(showRemove = true) {
  const containerId = "abroadContainer";
  const prefix = "විදෙස්ගත වූ තැනැත්තා";
  const count = document.getElementById(containerId).querySelectorAll(".dynamic-card").length + 1;

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
          <input type="text" class="form-control" data-field="year" placeholder="උදා: 2023" />
        </div>
      </div>
    `
  );
  appendCard(containerId, card);
}

// 7.3 මව / පියා අහිමි වූ දරුවන් Card
function addOrphanCard(showRemove = true) {
  const containerId = "orphanContainer";
  const prefix = "දරුවා";
  const count = document.getElementById(containerId).querySelectorAll(".dynamic-card").length + 1;

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

// 7.4 විශේෂ ආබාධ සහිත පුද්ගලයින් Card
function addDisabilityCard(showRemove = true) {
  const containerId = "disabilityContainer";
  const prefix = "පුද්ගලයා";
  const count = document.getElementById(containerId).querySelectorAll(".dynamic-card").length + 1;

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

// 7.5 ඇබ්බැහි වූවන් Card
function addAddictionCard(showRemove = true) {
  const containerId = "addictionContainer";
  const prefix = "පුද්ගලයා";
  const count = document.getElementById(containerId).querySelectorAll(".dynamic-card").length + 1;

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

// 7.6 විවිධ රජයේ / සමාජ ආධාර ලබන පුද්ගලයින් Card
function addWelfareCard(showRemove = true) {
  const containerId = "welfareContainer";
  const prefix = "ලාභියා";
  const count = document.getElementById(containerId).querySelectorAll(".dynamic-card").length + 1;

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

// 08. බැංකු ගිණුම් Card
function addBankCard(showRemove = true) {
  const containerId = "bankContainer";
  const prefix = "බැංකු ගිණුම";
  const count = document.getElementById(containerId).querySelectorAll(".dynamic-card").length + 1;

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

// 08. ණය පහසුකම් Card
function addLoanCard(showRemove = true) {
  const containerId = "loanContainer";
  const prefix = "ණය පහසුකම";
  const count = document.getElementById(containerId).querySelectorAll(".dynamic-card").length + 1;

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
  addSchoolChildCard(false);
  addLandCard(false);
  addLivestockCard(false);
  addVehicleCard(false);
  addAbroadCard(false);
  addOrphanCard(false);
  addDisabilityCard(false);
  addAddictionCard(false);
  addWelfareCard(false);
  addBankCard(false);
  addLoanCard(false);
}

function bindButtonEvents() {
  document.getElementById("prevStepBtn").addEventListener("click", () => {
    hideNavAlert();
    showStep(currentStep - 1);
  });

  document.getElementById("nextStepBtn").addEventListener("click", () => {
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

  document.getElementById("addSchoolChildBtn").addEventListener("click", () => addSchoolChildCard(true));
  document.getElementById("addLandBtn").addEventListener("click", () => addLandCard(true));
  document.getElementById("addLivestockBtn").addEventListener("click", () => addLivestockCard(true));
  document.getElementById("addVehicleBtn").addEventListener("click", () => addVehicleCard(true));
  document.getElementById("addAbroadBtn").addEventListener("click", () => addAbroadCard(true));
  document.getElementById("addOrphanBtn").addEventListener("click", () => addOrphanCard(true));
  document.getElementById("addDisabilityBtn").addEventListener("click", () => addDisabilityCard(true));
  document.getElementById("addAddictionBtn").addEventListener("click", () => addAddictionCard(true));
  document.getElementById("addWelfareBtn").addEventListener("click", () => addWelfareCard(true));
  document.getElementById("addBankBtn").addEventListener("click", () => addBankCard(true));
  document.getElementById("addLoanBtn").addEventListener("click", () => addLoanCard(true));

  document.getElementById("surveyForm").addEventListener("submit", handleFormSubmit);
  document.getElementById("resetFormBtn").addEventListener("click", handleFormReset);
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
    "q2_dsd", "q3_gnd", "q7_head_name", "q9_total_members",
    "q16_edu_level", "q35_floor", "q36a_roof", "q38_energy",
    "q39_water_supply", "q40_toilet", "q41a_phone_status",
    "q42_vehicle_status", "q44_aid_received", "q45_abroad_status",
    "q46_orphan_status", "q47_disability_status", "q48_addiction_status",
    "q49_welfare_status", "q52_loan_status", "certifyCheckbox"
  ];

  let filled = 0;
  keyIds.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.type === "checkbox") {
      if (el.checked) filled++;
    } else if (el.value && el.value.trim() !== "") {
      filled++;
    }
  });

  const pct = Math.round((filled / keyIds.length) * 100);
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
    card.querySelectorAll("[data-field]").forEach((input) => {
      const key = input.getAttribute("data-field");
      const val = (input.value || "").trim();
      item[key] = val;
      if (val !== "") hasValue = true;
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

  form.querySelectorAll("input[id], select[id], textarea[id]").forEach((el) => {
    if (el.type === "checkbox") {
      data[el.id] = el.checked ? "ඔව් (සහතික කර ඇත)" : "නැත";
    } else {
      data[el.id] = (el.value || "").trim();
    }
  });

  data.q43_disasters = collectCheckboxGroup("q43_disasters").join(", ");
  data.q43a_insurance = collectCheckboxGroup("q43a_insurance").join(", ");
  data.q09a_social = collectCheckboxGroup("q09a_social").join(", ");
  data.q09b_housing = collectCheckboxGroup("q09b_housing").join(", ");
  data.q09c_livelihood = collectCheckboxGroup("q09c_livelihood").join(", ");

  data.school_children_cards = collectCardData("schoolChildrenContainer");
  data.land_cards = collectCardData("landsContainer");
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
  box.className = `alert alert-${type === "success" ? "success" : "danger"} mt-3 fw-semibold`;
  box.textContent = message;
  box.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

async function handleFormSubmit(e) {
  e.preventDefault();
  hideNavAlert();

  const statusBox = document.getElementById("statusMessage");
  statusBox.className = "alert d-none";
  statusBox.textContent = "";

  const dsd = document.getElementById("q2_dsd").value.trim();
  const gnd = document.getElementById("q3_gnd").value.trim();
  const headName = document.getElementById("q7_head_name").value.trim();
  const totalMembers = document.getElementById("q9_total_members").value.trim();
  const certified = document.getElementById("certifyCheckbox").checked;

  if (!dsd || !gnd || !headName || !totalMembers) {
    showStep(1);
    showStatus(
      "error",
      "කරුණාකර අනිවාර්ය (*) මූලික තොරතුරු (02. ප්‍රා.ලේ. කොට්ඨාසය, 03. ග්‍රාම නිලධාරී වසම, 07. මූලිකයාගේ නම සහ 09. මුළු සාමාජික සංඛ්‍යාව) සම්පූර්ණ කරන්න."
    );
    return;
  }

  if (!certified) {
    showStep(9);
    showStatus(
      "error",
      "දත්ත Submit කිරීමට පෙර \"ඉහත තොරතුරු නිවැරදි හා සත්‍ය බවට මා සහතික කරමි.\" යන්න තෝරන්න."
    );
    return;
  }

  const submitBtn = document.getElementById("submitBtn");
  submitBtn.disabled = true;
  submitBtn.textContent = "දත්ත යවමින් පවතී...";

  try {
    const payload = buildPayload();
    await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });

    showStatus("success", "සාර්ථකයි! සමීක්ෂණ දත්ත Google Sheet වෙත සාර්ථකව යොමු කරන ලදී.");
  } catch (err) {
    showStatus("error", "දත්ත යැවීමේදී ගැටලුවක් ඇති විය. අන්තර්ජාල සම්බන්ධතාව පරීක්ෂා කර නැවත උත්සාහ කරන්න.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "දත්ත Submit කරන්න";
  }
}

function handleFormReset() {
  if (!confirm("ෆෝරමයේ ඇතුළත් කළ සියලුම දත්ත හිස් කිරීමට ඔබට විශ්වාසද?")) return;

  document.getElementById("surveyForm").reset();
  document.getElementById("q6_date").value = new Date().toISOString().split("T")[0];

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
  statusBox.className = "alert d-none";
  statusBox.textContent = "";

  showStep(1);
  updateProgress();
}
