import { api } from "./live-api.js";
import {
  esc,
  alert,
  button,
  field,
  form,
  formSubmit,
  link,
} from "./workspace-components.js";
const money = (minor: string, currency = "NGN") =>
  currency +
  " " +
  new Intl.NumberFormat("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(minor) / 100);
export async function applicationPayment(
  target: HTMLElement,
  draft: string,
  token: string,
) {
  const base = "/public/application-drafts/" + draft,
    headers = { "X-Payment-Token": token };
  let invoice = await api(base + "/payment", "GET", undefined, false, headers);
  if (!invoice) {
    target.innerHTML =
      alert(
        "Get your payment instructions",
        "Your amount is calculated from the fees confirmed by the school. Continue to see the amount and approved bank accounts.",
      ) + button("Show amount and bank accounts", "create-invoice", "primary");
    target
      .querySelector("#create-invoice")!
      .addEventListener("click", async () => {
        try {
          await api(base + "/payment", "POST", {}, false, headers);
          await applicationPayment(target, draft, token);
        } catch (error) {
          target.insertAdjacentHTML(
            "beforeend",
            alert(
              "Payment instructions unavailable",
              (error as Error).message,
              "warning",
            ),
          );
        }
      });
    return;
  }
  const status: Record<string, string> = {
    AWAITING_PROOF: "Awaiting payment proof",
    PENDING: "Proof submitted — under review",
    VERIFIED: "Payment verified",
    REJECTED: "Proof rejected — upload a replacement",
    CLARIFICATION: "Clarification requested",
    REFUNDED: "Payment refunded — contact the school",
  };
  target.innerHTML = `<h2>My payments</h2><p class="pw-badge">${esc(status[invoice.status] || invoice.status)}</p><h3>${money(invoice.amountMinor, invoice.currency)}</h3><p>Payment reference: <strong>${esc(invoice.reference)}</strong></p>${button("Copy payment reference", "copy-reference")}<dl>${invoice.lines.map((line: any) => `<dt>${esc(line.label)}</dt><dd>${money(line.amountMinor, line.currency)}</dd>`).join("")}</dl>${invoice.status === "VERIFIED" ? alert("Your payment is verified", "Check your email for your Student ID and password setup link. You can also download your receipt.", "success") + button("Download receipt", "download-receipt") : invoice.accounts.map((account: any, index: number) => `<section class="pw-card"><h3>${esc(account.bankName)}</h3><p>${esc(account.accountName)}</p><p><strong>${esc(account.accountNumber)}</strong> ${button("Copy account number", "copy-account-" + index)}</p><p>${esc(account.instructions)}</p><p class="pw-helper">Account details were saved with this payment request. Contact the school if you need to confirm them.</p></section>`).join("")}<ol><li>Transfer the exact amount to one of the school accounts shown.</li><li>Use your payment reference as the narration.</li><li>Upload your transfer receipt below. The school will confirm actual credit before marking your application paid.</li></ol>${invoice.proofs?.[0]?.reason ? alert("Latest review", invoice.proofs[0].reason, "warning") : ""}${!["VERIFIED", "REFUNDED"].includes(invoice.status) ? form(`${field("payerName", "Payer full name")}${field("amount", "Amount paid, e.g. 150000.00")}${field("bankUsed", "Bank used")}${field("transferDate", "Transfer date", "", "date")}${field("transactionReference", "Bank transaction reference")}<label class="pw-field full">Payment proof (JPG, PNG or PDF, maximum 5 MB)<input type="file" name="proof" id="payment-proof" accept="image/jpeg,image/png,application/pdf" required></label><div class="full" id="proof-preview"></div><p class="full pw-helper">Your proof is private. Uploading it does not verify the payment.</p>`, "Submit payment proof") : ""}<p>${button("Refresh payment status", "refresh-payment")}${link("Open student portal", "/student/login")}</p>`;
  if(invoice.accountsChanged&&invoice.status!=='VERIFIED'){target.insertAdjacentHTML('afterbegin',alert('Bank instructions changed','An account on this payment request is no longer current. Refresh the approved school details before making a transfer.','warning')+button('Refresh school account details','refresh-accounts'));target.querySelector('#refresh-accounts')!.addEventListener('click',async()=>{try{await api(base+'/payment/refresh-accounts','POST',{},false,headers);await applicationPayment(target,draft,token);}catch(error){target.insertAdjacentHTML('afterbegin',alert('Account details unavailable',(error as Error).message,'warning'));}});}
  const copy = (id: string, value: string) =>
    target.querySelector(id)?.addEventListener("click", () =>
      navigator.clipboard
        .writeText(value)
        .then(() => {
          target.querySelector(id)!.textContent = "Copied";
        })
        .catch(() => {}),
    );
  copy("#copy-reference", invoice.reference);
  invoice.accounts.forEach((account: any, index: number) =>
    copy("#copy-account-" + index, account.accountNumber),
  );
  target
    .querySelector("#refresh-payment")!
    .addEventListener("click", () => applicationPayment(target, draft, token));
  target
    .querySelector("#download-receipt")
    ?.addEventListener("click", async () => {
      const response = await fetch(
        "/backend-api/payments/" +
          encodeURIComponent(invoice.reference) +
          "/receipt",
        { headers, credentials: "same-origin" },
      );
      if (!response.ok) {
        target.insertAdjacentHTML(
          "beforeend",
          alert(
            "Receipt unavailable",
            "Refresh the payment status and try again.",
            "warning",
          ),
        );
        return;
      }
      const url = URL.createObjectURL(await response.blob()),
        a = document.createElement("a");
      a.href = url;
      a.download = invoice.reference + ".pdf";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  const el = target.querySelector<HTMLFormElement>("form");
  if (!el) return;
  el.querySelector("[data-cancel]")!.remove();
  let preview = "";
  const input = el.querySelector<HTMLInputElement>("#payment-proof")!;
  input.onchange = () => {
    if (preview) URL.revokeObjectURL(preview);
    const file = input.files?.[0];
    if (!file) return;
    preview = URL.createObjectURL(file);
    el.querySelector("#proof-preview")!.innerHTML = file.type.startsWith(
      "image/",
    )
      ? `<img src="${preview}" alt="Payment proof preview" style="max-width:100%;max-height:240px">`
      : `<p>PDF: ${esc(file.name)}</p>`;
  };
  formSubmit(el, async (values) => {
    const file = input.files?.[0];
    if (
      !file ||
      file.size > 5 * 1024 * 1024 ||
      !["image/jpeg", "image/png", "application/pdf"].includes(file.type)
    )
      throw Error("Choose a JPG, PNG or PDF file of 5 MB or less.");
    if (!/^\d+(?:\.\d{1,2})?$/.test(values.amount))
      throw Error("Enter the amount paid with at most two decimal places.");
    const csrf = await api("/auth/csrf"),
      filename = file.name.replace(/[^\w .()-]/g, "_").slice(0, 150);
    const upload = await fetch(
      "/backend-api" +
        base +
        "/files?purpose=Payment%20proof&filename=" +
        encodeURIComponent(filename),
      {
        method: "POST",
        credentials: "same-origin",
        headers: {
          ...headers,
          "X-CSRF-Token": csrf.csrfToken,
          "Content-Type": "application/octet-stream",
        },
        body: file,
      },
    );
    const uploaded = await upload.json();
    if (!upload.ok)
      throw Error(
        uploaded.error?.message || "Your proof could not be uploaded.",
      );
    const amount = values.amount.split(".");
    await api(
      base + "/proofs",
      "POST",
      {
        fileId: uploaded.id,
        payerName: values.payerName,
        amountMinor: (
          BigInt(amount[0]) * 100n +
          BigInt((amount[1] || "").padEnd(2, "0"))
        ).toString(),
        bankUsed: values.bankUsed,
        transferDate: values.transferDate,
        transactionReference: values.transactionReference,
      },
      false,
      headers,
    );
    if (preview) URL.revokeObjectURL(preview);
    await applicationPayment(target, draft, token);
  });
}
