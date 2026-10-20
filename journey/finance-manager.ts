import { api } from "./live-api.js";
import {
  esc,
  alert,
  button,
  link,
  field,
  form,
  formSubmit,
  dialog,
  toast,
} from "./workspace-components.js";
import { csv } from "./components.js";
const money = (value: any, currency = "NGN") =>
  currency +
  " " +
  new Intl.NumberFormat("en-GB", { minimumFractionDigits: 2 }).format(
    Number(value) / 100,
  );
export async function financeManager(
  target: HTMLElement,
  key: string,
  writable: boolean,
  refresh: () => Promise<void>,
) {
  if (key === "application-settings") {
    const options = await api("/admin/application-options");
    const fees = await api("/public/fees?take=100");
    target.innerHTML =
      alert(
        "Application policies",
        "Publish the actual school privacy notice, terms and refund policy. Select the registration fee charged to new applicants. The server checks this fee before issuing an invoice.",
      ) +
      form(
        field(
          "privacyNotice",
          "Privacy notice",
          options.privacyNotice || "",
          "textarea",
        ) +
          field("terms", "Terms", options.terms || "", "textarea") +
          field(
            "refundPolicy",
            "Refund policy",
            options.refundPolicy || "",
            "textarea",
          ) +
          `<label class="pw-field full">Application registration fee<select name="applicationFeeId" required><option value="">Choose a confirmed fee</option>${fees
            .filter((fee: any) => fee.active && fee.purpose === "REGISTRATION")
            .map(
              (fee: any) =>
                `<option value="${fee.id}" ${options.applicationFeeId === fee.id ? "selected" : ""}>${esc(fee.name)} — ${money(fee.amountMinor, fee.currency)}</option>`,
            )
            .join("")}</select></label>`,
        "Save application settings",
      );
    const el = target.querySelector<HTMLFormElement>("form")!;
    el.querySelector("[data-cancel]")!.remove();
    if (!writable)
      el.querySelectorAll<HTMLInputElement>(
        "input,textarea,select,button",
      ).forEach((input) => (input.disabled = true));
    else
      formSubmit(el, async (values) => {
        await api("/admin/application-options", "PUT", values);
        toast("Application settings saved.");
      });
    return;
  }
  if (key === "payment-accounts") {
    const rows = await api<any[]>("/admin/payment-accounts");
    target.innerHTML =
      alert(
        "Protect school payment accounts",
        "Every change requires your password and a fresh authenticator code. Account numbers are masked in the audit log. The school owner receives an email alert.",
      ) +
      (writable
        ? button("Add payment account", "add-account", "primary")
        : "") +
      rows
        .map(
          (row, index) =>
            `<section class="pw-card"><h2>${esc(row.bankName)}</h2><p>${esc(row.accountName)} · ${esc(row.accountNumber)}</p><p>${esc(row.currency)} · ${esc(row.purpose)} · ${row.active ? "Active" : "Inactive"} · Display order ${row.order}</p><p>${esc(row.instructions)}</p><p class="pw-helper">Last changed by ${esc(row.changedByName || row.changedBy)} on ${new Date(row.changedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>${writable ? button("Edit or deactivate", "account-" + index) : ""}</section>`,
        )
        .join("");
    const edit = (row?: any) => {
      const el = dialog(
        row ? "Edit school payment account" : "Add school payment account",
        form(
          field("bankName", "Bank name", row?.bankName || "") +
            field("accountName", "Account name", row?.accountName || "") +
            field("accountNumber", "Account number", row?.accountNumber || "") +
            field("currency", "Currency", row?.currency || "NGN", "text", [
              "NGN",
              "USD",
            ]) +
            field("purpose", "Payment purpose", row?.purpose || "ALL", "text", [
              "EXAMS",
              "HOSTEL",
              "FEES",
              "ALL",
            ]) +
            field(
              "instructions",
              "Extra instructions",
              row?.instructions || "",
              "textarea",
              undefined,
              false,
            ) +
            field(
              "active",
              "Active account",
              row?.active ?? true,
              "checkbox",
              undefined,
              false,
            ) +
            field("order", "Display order", row?.order || 0, "number") +
            field("password", "Re-enter your admin password", "", "password") +
            field("code", "Fresh six-digit authenticator code"),
          "Confirm payment-account change",
        ),
        true,
      );
      el.querySelector("[data-cancel]")!.addEventListener("click", () =>
        el.close(),
      );
      formSubmit(el.querySelector("form")!, async (values) => {
        const { password, code, ...account } = values;
        await api(
          "/admin/payment-accounts" + (row ? "/" + row.id : ""),
          row ? "PATCH" : "POST",
          {
            account: {
              ...account,
              active: account.active === "on",
              order: Number(account.order),
            },
            authentication: { password, code },
          },
        );
        el.close();
        toast("Payment account saved. The owner alert has been queued.");
        await refresh();
      });
    };
    target
      .querySelector("#add-account")
      ?.addEventListener("click", () => edit());
    rows.forEach((row, index) =>
      target
        .querySelector("#account-" + index)
        ?.addEventListener("click", () => edit(row)),
    );
    return;
  }
  const rows = await api<any[]>("/admin/transfer-proofs?take=100");
  target.innerHTML =
    alert(
      "Confirm the bank credit",
      "Confirm the credit in the school bank account before verifying; screenshots can be edited. Suspicious-proof flags require investigation.",
    ) +
    `<div class="pw-row"><label>Filter proofs<select id="proof-filter"><option value="">All</option><option value="PENDING">Pending</option><option value="VERIFIED">Verified</option><option value="REJECTED">Rejected</option><option value="CLARIFICATION">Clarification</option></select></label>${button("Export payments CSV", "export-transfers")}</div><div id="proof-list"></div>`;
  const list = target.querySelector("#proof-list")!;
  const render = (filter = "") => {
    list.innerHTML =
      rows
        .filter((row) => !filter || row.status === filter)
        .map(
          (row) =>
            `<section class="pw-card"><h2>${esc(row.reference)}</h2><p>${esc(row.status)} · ${esc(row.payerName)} · Expected ${money(row.expectedAmountMinor, row.currency)} · Claimed ${money(row.amountMinor, row.currency)}</p>${row.flags.length ? alert("Review flags", row.flags.join(", "), "warning") : ""}${button("Review payment proof", "proof-" + row.id)}</section>`,
        )
        .join("") || "<p>No payment proofs match this filter.</p>";
    list
      .querySelectorAll<HTMLButtonElement>("[id^=proof-]")
      .forEach(
        (control) =>
          (control.onclick = () =>
            review(rows.find((row) => "proof-" + row.id === control.id))),
      );
  };
  render();
  target.querySelector<HTMLSelectElement>("#proof-filter")!.onchange = (
    event,
  ) => render((event.target as HTMLSelectElement).value);
  target
    .querySelector("#export-transfers")!
    .addEventListener("click", async () => {
      try {
        const all: any[] = [];
        for (let skip = 0; skip < 10000; skip += 100) {
          const batch = await api<any[]>(
            "/admin/transfer-proofs?take=100&skip=" + skip,
          );
          all.push(...batch);
          if (batch.length < 100) break;
        }
        csv(
          "payment-proofs.csv",
          all.map((row) => ({
            reference: row.reference,
            status: row.status,
            payerName: row.payerName,
            expectedAmount: money(row.expectedAmountMinor, row.currency),
            claimedAmount: money(row.amountMinor, row.currency),
            bank: row.bankUsed,
            transactionReference: row.transactionReference,
            transferDate: row.transferDate,
            flags: row.flags.join("; "),
          })),
        );
      } catch (error) {
        toast((error as Error).message);
      }
    });
  async function review(row: any) {
    const el = dialog(
      "Review payment proof",
      `<div class="pw-grid two"><section class="pw-card" id="proof-view"><p>Loading private proof…</p></section><section><h2>${esc(row.reference)}</h2><p>${esc(row.payerName)} · ${esc(row.bankUsed)}</p><p>Bank reference: ${esc(row.transactionReference)}</p><p>Transfer date: ${new Date(row.transferDate).toLocaleDateString("en-GB")}</p><p>Expected: <strong>${money(row.expectedAmountMinor, row.currency)}</strong></p><p>Claimed: ${money(row.amountMinor, row.currency)}</p>${alert("Before you verify", "Confirm the credit in the school bank account before verifying; screenshots can be edited.", "warning")}${writable && row.status !== "VERIFIED" ? form(field("decision", "Decision", "CLARIFICATION", "text", ["VERIFIED", "REJECTED", "CLARIFICATION"]) + field("reason", "Reason or clarification request", "", "textarea") + field("amount", "Actual credited amount (required for verification)", "", "text", undefined, false) + field("creditConfirmed", "I checked the actual credit in the school bank account", false, "checkbox", undefined, false), "Save payment review") : "<p>This proof is read-only.</p>"}</section></div>`,
      true,
    );
    try {
      const file = await api("/admin/transfer-proofs/" + row.id + "/file");
      el.querySelector("#proof-view")!.innerHTML = file.mime.startsWith(
        "image/",
      )
        ? `<label>Proof zoom<input type="range" id="proof-zoom" min="100" max="250" value="100"></label><div style="overflow:auto"><img id="proof-image" src="${esc(file.url)}" alt="Private payment proof" style="max-width:none;width:100%"></div><p><a href="${esc(file.url)}" target="_blank" rel="noopener noreferrer">Open private proof</a></p>`
        : `<p>PDF payment proof. This private link expires shortly.</p><a class="pw-button" href="${esc(file.url)}" target="_blank" rel="noopener noreferrer">Open private PDF proof</a>`;
      el.querySelector<HTMLInputElement>("#proof-zoom")?.addEventListener(
        "input",
        (event) =>
          ((el.querySelector("#proof-image") as HTMLElement).style.width =
            (event.target as HTMLInputElement).value + "%"),
      );
    } catch (error) {
      el.querySelector("#proof-view")!.innerHTML = alert(
        "Proof unavailable",
        (error as Error).message,
        "warning",
      );
    }
    const reviewForm = el.querySelector<HTMLFormElement>("form");
    if (reviewForm) {
      reviewForm
        .querySelector("[data-cancel]")!
        .addEventListener("click", () => el.close());
      formSubmit(reviewForm, async (values) => {
        if (values.amount && !/^\d+(?:\.\d{1,2})?$/.test(values.amount))
          throw Error("Enter a valid credited amount.");
        const data: any = {
          decision: values.decision,
          reason: values.reason,
          creditConfirmed: values.creditConfirmed === "on",
        };
        if (values.amount) {
          const [whole, fraction = ""] = values.amount.split(".");
          data.creditedAmountMinor = (
            BigInt(whole) * 100n +
            BigInt(fraction.padEnd(2, "0"))
          ).toString();
        }
        await api("/admin/transfer-proofs/" + row.id + "/review", "POST", data);
        el.close();
        toast("Payment review saved.");
        await refresh();
      });
    }
  }
}
