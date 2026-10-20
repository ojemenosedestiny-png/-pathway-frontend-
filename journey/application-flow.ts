import { api } from "./live-api.js";
import {
  esc,
  field,
  form,
  formSubmit,
  alert,
  button,
  link,
} from "./workspace-components.js";
import type { CatalogueEntry } from "./catalogue-public.js";
const labels = [
  "Your details",
  "Parent or guardian",
  "Academic background",
  "Programme choice",
  "Documents",
  "Review and declaration",
  "Payment",
];
const groups = [
  "applicant",
  "guardian",
  "academic",
  "choice",
  "documents",
  "declaration",
];
const docTypes = [
  "Passport photograph",
  "Previous results",
  "Birth certificate",
  "Last report card or transcript",
  "Passport data page",
];
export async function renderApplicationFlow(
  root: HTMLElement,
): Promise<boolean> {
  let options: any;
  try {
    options = await api("/public/application-options");
  } catch (e: any) {
    if (e.status === 404) return false;
    throw e;
  }
  if (!Array.isArray(options?.exams)) return false;
  let state: any = {
    applicant: {},
    guardian: {},
    academic: {},
    choice: { exams: [], candidateType: "School", hostelNeeded: false },
    declaration: {},
  };
  let files: any[] = [],
    draft = "",
    token = "",
    step = 0,
    saveTimer: ReturnType<typeof setTimeout> | undefined;
  const hash = new URLSearchParams(location.hash.slice(1));
  draft = hash.get("draft") || "";
  token = hash.get("token") || "";
  const path = () => "/public/application-drafts/" + draft;
  const headers = () => ({ "X-Payment-Token": token });
  if (draft && token) {
    const saved = await api(path(), "GET", undefined, false, headers());
    state = { ...state, ...saved.data };
    files = saved.files || [];
    if (saved.submitted) step = 6;
  }
  const preferred = new URLSearchParams(location.search).get("exam");
  if (!draft && preferred) {
    const exam = options.exams.find((row: any) => row.id === preferred);
    if (exam)
      state.choice.exams = [
        { id: exam.id, session: exam.session, subjects: [] },
      ];
  }
  document.body.classList.add("pw", "pw-body");
  document.title = "Apply to NewworldPathway";
  root.innerHTML = `<main class="pw-content"><p class="pw-overline">NewworldPathway / Application</p><h1>Your next chapter starts here</h1><p class="pw-helper">Apply before a student portal is created. Your details and documents are private. A Student ID follows verified registration payment.</p><p>${link("Return to the website", "/")}</p><ol class="application-stepper" aria-label="Application progress">${labels.map((label, index) => `<li><button type="button" class="pw-button" data-step="${index}" ${index ? "disabled" : ""}>${index + 1}. ${label}</button></li>`).join("")}</ol><p id="draft-status" role="status"></p><section class="pw-card" id="application-panel"></section></main>`;
  const panel = root.querySelector<HTMLElement>("#application-panel")!;
  const status = root.querySelector<HTMLElement>("#draft-status")!;
  const minor = () => {
    const born = new Date(state.applicant.dateOfBirth + "T00:00:00Z");
    if (Number.isNaN(born.getTime())) return false;
    const now = new Date();
    let age = now.getUTCFullYear() - born.getUTCFullYear();
    if (
      now.getUTCMonth() < born.getUTCMonth() ||
      (now.getUTCMonth() === born.getUTCMonth() &&
        now.getUTCDate() < born.getUTCDate())
    )
      age--;
    return age < 18;
  };
  const capture = () => {
    const form = panel.querySelector("form");
    if (!form || step > 5) return;
    const values: any = Object.fromEntries(new FormData(form));
    if (step === 3) {
      const exams = (options.exams as CatalogueEntry[])
        .filter(
          (exam) =>
            form.querySelector<HTMLInputElement>(
              '[name="exam-' + exam.id + '"]',
            )?.checked,
        )
        .map((exam) => ({
          id: exam.id,
          session: exam.session,
          subjects: Array.from(
            form.querySelectorAll<HTMLInputElement>(
              '[name="subject-' + exam.id + '"]:checked',
            ),
          ).map((input) => input.value),
        }));
      state.choice = {
        exams,
        candidateType: values.candidateType,
        hostelNeeded: values.hostelNeeded === "on",
        ...(values.hostelId ? { hostelId: values.hostelId } : {}),
        destination: values.destination || "",
        consultation: values.consultation === "on",
      };
    } else if (step === 5) {
      state.declaration = Object.fromEntries(
        [
          "trueInformation",
          "privacy",
          "terms",
          "refundPolicy",
          "guardianConsent",
        ].map((name) => [name, values[name] === "on"]),
      );
    } else if (step < 3) {
      state[groups[step]] = values;
    }
  };
  const payload = () => {
    const data = JSON.parse(JSON.stringify(state));
    for (const group of ["applicant", "guardian", "academic"])
      for (const key of Object.keys(data[group] || {}))
        if (data[group][key] === "") delete data[group][key];
    if (!data.choice.exams?.length) delete data.choice.exams;
    for (const name of Object.keys(data.declaration || {}))
      if (data.declaration[name] === false) delete data.declaration[name];
    return data;
  };
  const saveDraft = async () => {
    capture();
    if (!draft) {
      const email = state.applicant.email;
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
      const created = await api(
        "/public/application-drafts",
        "POST",
        { email },
        false,
      );
      draft = created.id;
      token = created.token;
      history.replaceState(
        null,
        "",
        "#draft=" + draft + "&token=" + encodeURIComponent(token),
      );
    }
    await api(path(), "PUT", payload(), false, headers());
    status.textContent =
      "Draft saved privately. Keep your private link, or email it to yourself.";
  };
  let saveChain = Promise.resolve();
  const save = () => {
    saveChain = saveChain.catch(() => {}).then(saveDraft);
    return saveChain;
  };
  const f = (
    name: string,
    label: string,
    type = "text",
    required = true,
    choices?: string[],
  ) =>
    field(
      name,
      label,
      state[groups[step]]?.[name] ?? "",
      type,
      choices,
      required,
    );
  const check = (
    name: string,
    label: string,
    checked: boolean,
    required = false,
  ) =>
    `<label class="pw-check-label"><input type="checkbox" name="${name}" ${checked ? "checked" : ""} ${required ? "required" : ""}> ${esc(label)}</label><small class="pw-inline-error" data-error="${name}"></small>`;
  const review = () =>
    ["applicant", "guardian", "academic", "choice"]
      .map(
        (group, index) =>
          `<section class="pw-card"><h3>${labels[index]}</h3><dl>${Object.entries(
            state[group] || {},
          )
            .map(
              ([key, value]) =>
                `<dt>${esc(key.replace(/([A-Z])/g, " $1"))}</dt><dd>${esc(Array.isArray(value) ? value.map((entry: any) => (typeof entry === "object" ? (options.exams.find((exam: any) => exam.id === entry.id)?.name || "Exam") + " · " + entry.session + " · " + entry.subjects.join(", ") : String(entry))).join("; ") : String(value ?? ""))}</dd>`,
            )
            .join(
              "",
            )}</dl><button type="button" class="pw-button" data-edit="${index}">Edit ${labels[index].toLowerCase()}</button></section>`,
      )
      .join("");
  const show = () => {
    root
      .querySelectorAll<HTMLButtonElement>("[data-step]")
      .forEach((control, index) => {
        control.disabled = index > step;
        control.setAttribute("aria-current", index === step ? "step" : "false");
      });
    let body = "";
    if (step === 0)
      body =
        f("firstName", "First name") +
        f("middleName", "Middle name (optional)", "text", false) +
        f("lastName", "Last name") +
        f("dateOfBirth", "Date of birth", "date") +
        f("gender", "Gender", "text", true, [
          "Female",
          "Male",
          "Prefer not to say",
        ]) +
        f("nationality", "Nationality") +
        f("stateOfOrigin", "State of origin (Nigerians)", "text", false) +
        f("lga", "Local government area (Nigerians)", "text", false) +
        f("residenceCountry", "Country of residence") +
        f("address", "Home address", "textarea") +
        f("email", "Email address", "email") +
        f("phone", "Phone number", "tel") +
        f("whatsapp", "WhatsApp number (optional)", "tel", false) +
        `<p class="full pw-helper">You can upload your passport photograph in the documents step. ${esc(options.policies?.privacyNotice || "The school uses your details to assess your application and contact you. Contact admissions with privacy or deletion requests.")}</p>`;
    if (step === 1) {
      body =
        `<p class="full pw-helper">${minor() ? "Parent or guardian details and consent are required because you are under 18." : "Parent or guardian details are optional for applicants aged 18 or over."}</p>` +
        f("name", "Full name", "text", minor()) +
        f("relationship", "Relationship", "text", minor()) +
        f("phone", "Guardian phone", "tel", minor()) +
        f("email", "Guardian email", "email", minor()) +
        f("address", "Guardian address", "textarea", minor()) +
        f("occupation", "Occupation (optional)", "text", false) +
        f("emergencyContact", "Emergency contact details", "textarea", minor());
    }
    if (step === 2)
      body =
        f("school", "Current or most recent school") +
        f("level", "Current class or qualification") +
        f("notes", "Special needs or notes (optional)", "textarea", false) +
        `<p class="full pw-helper">Upload previous results in the documents step. Share only information admissions needs to support your application.</p>`;
    if (step === 3) {
      body =
        `<div class="full"><p>Choose one or more published examination programmes. Sessions and subjects are set by the school.</p>${
          options.exams.length
            ? options.exams
                .map((exam: CatalogueEntry) => {
                  const chosen = state.choice.exams?.find(
                    (entry: any) => entry.id === exam.id,
                  );
                  return `<fieldset class="pw-card"><legend>${esc(exam.name)}</legend>${check("exam-" + exam.id, "Apply for " + exam.name, !!chosen)}<p>Session: ${esc(exam.session || "Awaiting confirmation by the school")}</p>${exam.subjects.length ? exam.subjects.map((subject) => `<label class="pw-check-label"><input type="checkbox" name="subject-${exam.id}" value="${esc(subject)}" ${chosen?.subjects?.includes(subject) ? "checked" : ""}> ${esc(subject)}</label>`).join("") : "<p>Subjects have not been published yet.</p>"}<p>${esc(exam.disclaimer)}</p></fieldset>`;
                })
                .join("")
            : alert(
                "Programmes are being updated",
                "Save your draft and contact admissions before choosing an examination.",
              )
        }</div>` +
        f("candidateType", "Candidate type", "text", true, [
          "School",
          "Private",
        ]) +
        check(
          "hostelNeeded",
          "I need student accommodation",
          !!state.choice.hostelNeeded,
        ) +
        `<label class="pw-field">Accommodation preference (if needed)<select name="hostelId"><option value="">Choose accommodation</option>${options.hostels.map((entry: any) => `<option value="${entry.id}" ${state.choice.hostelId === entry.id ? "selected" : ""}>${esc(entry.name)}</option>`).join("")}</select></label>` +
        f(
          "destination",
          "Intended study destination (optional)",
          "text",
          false,
        ) +
        check(
          "consultation",
          "I would like an adviser consultation",
          !!state.choice.consultation,
        );
    }
    if (step === 4)
      body = `<div class="full"><p>Upload JPG, PNG or PDF files of 5 MB or less. Passport photographs must be JPG or PNG. Files remain private and are checked before storage.</p><div class="application-drop" tabindex="0" role="group" aria-label="Application documents">${field("purpose", "Document type", docTypes[0], "text", docTypes)}<label class="pw-field">Choose or drop a document<input type="file" id="applicant-file" accept="image/jpeg,image/png,application/pdf"></label><p class="pw-helper">Birth certificate, last report card or transcript and passport photograph are required. International applicants also need their passport data page.</p><div id="document-preview"></div><button type="button" class="pw-button" id="upload-document">Upload document</button><p role="status" id="upload-status"></p></div><ul>${files.map((file) => `<li>${esc(file.purpose)} — ${esc(file.filename)} (checked)</li>`).join("")}</ul></div>`;
    if (step === 5)
      body = `<div class="full">${review()}<section class="pw-card"><h3>Documents</h3><ul>${files.map((file) => `<li>${esc(file.purpose)} — ${esc(file.filename)}</li>`).join("")}</ul><button type="button" class="pw-button" data-edit="4">Edit documents</button></section><h3>Your declaration</h3>${[
        ["privacyNotice", "Privacy notice"],
        ["terms", "Terms"],
        ["refundPolicy", "Refund policy"],
      ]
        .map(
          ([key, title]) =>
            `<details><summary>${title}</summary><p class="pw-prose">${esc(options.policies?.[key] || "This policy has not yet been published. Contact admissions before submitting.")}</p></details>`,
        )
        .join(
          "",
        )}${check("trueInformation", "I confirm that the information is true and complete.", !!state.declaration.trueInformation, true)}${check("privacy", "I have read the privacy notice and consent to the stated use of my data under the Nigeria Data Protection Act.", !!state.declaration.privacy, true)}${check("terms", "I accept the published terms.", !!state.declaration.terms, true)}${check("refundPolicy", "I have read the published refund policy.", !!state.declaration.refundPolicy, true)}${minor() ? check("guardianConsent", "As the parent or guardian, I consent to this application.", !!state.declaration.guardianConsent, true) : ""}<p>Submitting an application does not create a student portal or confirm official examination registration.</p></div>`;
    if (step === 6) {
      panel.innerHTML = `<h2>Application received</h2><p>Your application has been saved for admissions to review. Keep this private link to return to your payment information.</p><div id="application-payment" role="region" aria-label="My payments"><p role="status">Loading payment information…</p></div>${link("Contact admissions", "/contact")}`;
      const mount = panel.querySelector<HTMLElement>("#application-payment")!;
      applicationPayment(mount, draft, token).catch(
        (error) =>
          (mount.innerHTML = alert(
            "Payment information unavailable",
            (error as Error).message,
            "warning",
          )),
      );
      return;
    }
    panel.innerHTML =
      `<h2>${step + 1}. ${labels[step]}</h2>` +
      form(body, step === 5 ? "Submit application" : "Save and continue");
    const el = panel.querySelector<HTMLFormElement>("form")!;
    el.querySelector("[data-cancel]")!.textContent = step
      ? "Previous step"
      : "Return to website";
    el.querySelector("[data-cancel]")!.addEventListener("click", () => {
      capture();
      if (step) {
        step--;
        show();
      } else location.assign("/");
    });
    el.querySelector("footer")!.insertAdjacentHTML(
      "afterbegin",
      button("Save and continue later", "email-draft"),
    );
    el.querySelector("#email-draft")!.addEventListener("click", async () => {
      try {
        await save();
        if (!draft) throw Error("Enter your email address first.");
        await api(path() + "/email-link", "POST", {}, false, headers());
        status.textContent =
          "A private continuation link has been queued to your email. Check your inbox and spam folder.";
      } catch (error) {
        status.textContent = (error as Error).message;
      }
    });
    el.addEventListener("input", () => {
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(
        () =>
          save().catch(
            () =>
              (status.textContent =
                "Draft not saved yet. Complete the current fields and try again."),
          ),
        1500,
      );
    });
    formSubmit(el, async () => {
      capture();
      if (
        step === 3 &&
        (!state.choice.exams.length ||
          state.choice.exams.some(
            (exam: any) => !exam.session || !exam.subjects.length,
          ))
      )
        throw Error(
          "Choose at least one examination with a published session and at least one subject.",
        );
      await save();
      if (step === 5) {
        await api(path() + "/submit", "POST", {}, false, headers());
        step = 6;
      } else step++;
      show();
      panel.tabIndex = -1;
      panel.focus();
    });
    panel.querySelectorAll<HTMLButtonElement>("[data-edit]").forEach(
      (control) =>
        (control.onclick = () => {
          step = Number(control.dataset.edit);
          show();
        }),
    );
    if (step === 4) {
      let selected: File | undefined,
        previewURL = "";
      const input = panel.querySelector<HTMLInputElement>("#applicant-file")!;
      const preview = (file: File) => {
        selected = file;
        if (previewURL) URL.revokeObjectURL(previewURL);
        const target = panel.querySelector("#document-preview")!;
        if (
          file.size > 5 * 1024 * 1024 ||
          !["image/jpeg", "image/png", "application/pdf"].includes(file.type)
        ) {
          selected = undefined;
          target.textContent = "Choose a JPG, PNG or PDF of 5 MB or less.";
          return;
        }
        previewURL = URL.createObjectURL(file);
        target.innerHTML = file.type.startsWith("image/")
          ? `<img src="${previewURL}" alt="Selected document preview" style="max-width:100%;max-height:220px">`
          : `<p>PDF selected: ${esc(file.name)}</p>`;
      };
      input.onchange = () => {
        if (input.files?.[0]) preview(input.files[0]);
      };
      const drop = panel.querySelector<HTMLElement>(".application-drop")!;
      drop.ondragover = (event) => event.preventDefault();
      drop.ondrop = (event) => {
        event.preventDefault();
        if (event.dataTransfer?.files[0]) preview(event.dataTransfer.files[0]);
      };
      panel.querySelector<HTMLButtonElement>("#upload-document")!.onclick =
        async () => {
          const message = panel.querySelector("#upload-status")!;
          try {
            if (!selected) throw Error("Choose a document first.");
            await save();
            const csrf = await api("/auth/csrf");
            const purpose = (
              el.elements.namedItem("purpose") as HTMLSelectElement
            ).value;
            const filename = selected.name
              .replace(/[^\w .()-]/g, "_")
              .slice(0, 150);
            const response = await fetch(
              "/backend-api" +
                path() +
                "/files?purpose=" +
                encodeURIComponent(purpose) +
                "&filename=" +
                encodeURIComponent(filename),
              {
                method: "POST",
                credentials: "same-origin",
                headers: {
                  ...headers(),
                  "X-CSRF-Token": csrf.csrfToken,
                  "Content-Type": "application/octet-stream",
                },
                body: selected,
              },
            );
            const result = await response.json();
            if (!response.ok)
              throw Error(
                result.error?.message || "The document could not be uploaded.",
              );
            files.push(result);
            if (previewURL) URL.revokeObjectURL(previewURL);
            show();
          } catch (error) {
            message.textContent = (error as Error).message;
          }
        };
    }
  };
  root.querySelectorAll<HTMLButtonElement>("[data-step]").forEach(
    (control) =>
      (control.onclick = () => {
        capture();
        step = Number(control.dataset.step);
        show();
      }),
  );
  show();
  return true;
}
import { applicationPayment } from "./application-payment.js";
