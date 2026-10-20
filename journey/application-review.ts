import { api } from "./live-api.js";
import {
  esc,
  button,
  field,
  form,
  formSubmit,
  dialog,
  confirm,
  toast,
  alert,
} from "./workspace-components.js";
export async function applicationReviewDetails(
  target: HTMLElement,
  id: string,
  writable: boolean,
) {
  let record: any;
  try {
    record = await api("/admin/application-drafts/" + id);
  } catch (e: any) {
    if (e.status === 404) return;
    throw e;
  }
  if(!record?.id||!record?.data||!Array.isArray(record.files))return;
  const section = document.createElement("section");
  section.className = "pw-card";
  section.innerHTML = `<h3>Full application</h3>${Object.entries(
    record.data || {},
  )
    .map(
      ([group, value]: any) =>
        `<details><summary>${esc(group.replace(/^./, (c: string) => c.toUpperCase()))}</summary><pre class="pw-prose" style="white-space:pre-wrap;overflow-wrap:anywhere">${esc(JSON.stringify(value, null, 2))}</pre></details>`,
    )
    .join(
      "",
    )}<h3>Private documents</h3><ul>${record.files.map((file: any, index: number) => `<li>${esc(file.purpose)} — ${esc(file.filename)} ${button("Download document", "application-document-" + index)}</li>`).join("")}</ul>${button("Export applicant data", "export-application-data")}${writable ? button("Request data deletion", "erase-application", "danger") : ""}`;
  target.append(section);
  record.files.forEach((file: any, index: number) =>
    section
      .querySelector("#application-document-" + index)!
      .addEventListener("click", async () => {
        try {
          const result = await api(
            "/admin/application-drafts/" + id + "/files/" + file.id,
          );
          const a = document.createElement("a");
          a.href = result.url;
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          a.click();
        } catch (error) {
          toast((error as Error).message);
        }
      }),
  );
  section
    .querySelector("#export-application-data")!
    .addEventListener("click", async () => {
      try {
        const data = await api("/admin/applicants/" + id + "/export");
        const url = URL.createObjectURL(
            new Blob([JSON.stringify(data, null, 2)], {
              type: "application/json",
            }),
          ),
          a = document.createElement("a");
        a.href = url;
        a.download = "applicant-data.json";
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } catch (error) {
        toast((error as Error).message);
      }
    });
  section.querySelector("#erase-application")?.addEventListener("click", () => {
    const el = dialog(
      "Applicant data deletion",
      alert(
        "Confirm the request",
        "Check the applicant’s identity and the school’s retention obligations first. Financial records require separate review.",
        "warning",
      ) +
        form(
          field(
            "reason",
            "Reason and authorisation for deletion",
            "",
            "textarea",
          ),
          "Delete eligible applicant data",
        ),
    );
    el.querySelector("[data-cancel]")!.addEventListener("click", () =>
      el.close(),
    );
    formSubmit(el.querySelector("form")!, async (values) => {
      if (
        !(await confirm(
          "Permanently delete applicant data?",
          "This removes eligible application data and stored documents.",
          "Delete data",
        ))
      )
        return;
      await api("/admin/applicants/" + id + "/private-data", "DELETE", values);
      el.close();
      toast("Eligible applicant data deleted.");
      location.reload();
    });
  });
}
