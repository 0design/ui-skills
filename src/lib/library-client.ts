import type { LibraryCollection, LibrarySnapshot } from "./library-types";

type LibraryPayload = {
  library: LibrarySnapshot;
  collection?: LibraryCollection;
};

async function requestLibrary(
  path: string,
  method: string,
  body?: Record<string, unknown>,
) {
  const response = await fetch(path, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = (await response.json().catch(() => null)) as
    (LibraryPayload & { error?: string }) | null;
  if (
    !response.ok ||
    !payload ||
    !Array.isArray(payload.library?.savedSkillPaths)
  ) {
    const message =
      payload && typeof payload.error === "string" && payload.error.length < 180
        ? payload.error
        : "That action could not be completed. Please try again.";
    throw new Error(message);
  }
  return payload;
}

export function fetchLibrary() {
  return requestLibrary("/api/library", "GET");
}

export function saveSkill(skillPath: string) {
  return requestLibrary("/api/library/saved", "POST", { skillPath });
}

export function unsaveSkill(skillPath: string) {
  return requestLibrary("/api/library/saved", "DELETE", { skillPath });
}

export function createCollection(input: {
  title: string;
  description?: string;
  skillPath?: string;
}) {
  return requestLibrary("/api/library/collections", "POST", input);
}

export function updateCollection(
  id: string,
  input: { title?: string; description?: string },
) {
  return requestLibrary(`/api/library/collections/${id}`, "PATCH", input);
}

export function deleteCollection(id: string) {
  return requestLibrary(`/api/library/collections/${id}`, "DELETE");
}

export function addSkillToCollection(id: string, skillPath: string) {
  return requestLibrary(`/api/library/collections/${id}/skills`, "POST", {
    skillPath,
  });
}

export function removeSkillFromCollection(id: string, skillPath: string) {
  return requestLibrary(`/api/library/collections/${id}/skills`, "DELETE", {
    skillPath,
  });
}

function showError(error: HTMLElement | null, message: string | null) {
  if (!error) return;
  if (!message) {
    error.hidden = true;
    return;
  }
  error.textContent = message;
  error.hidden = false;
}

/** Shows and hides panels named by `data-disclosure` buttons. */
function bindDisclosures(root: ParentNode) {
  root
    .querySelectorAll<HTMLButtonElement>("[data-disclosure]")
    .forEach((toggle) => {
      const panel = document.getElementById(
        toggle.getAttribute("aria-controls") ?? "",
      );
      if (!panel) return;

      const setOpen = (open: boolean) => {
        panel.hidden = !open;
        toggle.setAttribute("aria-expanded", String(open));
        if (open) panel.querySelector<HTMLElement>("input, textarea")?.focus();
      };

      toggle.addEventListener("click", () => setOpen(panel.hidden));
      panel
        .querySelectorAll<HTMLElement>("[data-disclosure-close]")
        .forEach((close) =>
          close.addEventListener("click", () => {
            setOpen(false);
            toggle.focus();
          }),
        );
      panel.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") return;
        setOpen(false);
        toggle.focus();
      });
    });
}

/** Wires the server-rendered library forms to the library API. */
export function bindLibraryPage(root: ParentNode = document) {
  const error = root.querySelector<HTMLElement>("[data-library-error]");
  let pending = false;

  bindDisclosures(root);

  const run = async (control: HTMLElement, action: () => Promise<void>) => {
    if (pending) return;
    pending = true;
    control.setAttribute("aria-busy", "true");
    if (control instanceof HTMLButtonElement) control.disabled = true;
    showError(error, null);
    try {
      await action();
    } catch (caught) {
      showError(
        error,
        caught instanceof Error
          ? caught.message
          : "That action could not be completed. Please try again.",
      );
      control.removeAttribute("aria-busy");
      if (control instanceof HTMLButtonElement) control.disabled = false;
      pending = false;
    }
  };

  root
    .querySelector<HTMLFormElement>("[data-create-collection]")
    ?.addEventListener("submit", (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      if (!(form instanceof HTMLFormElement)) return;
      const data = new FormData(form);
      const title = String(data.get("title") ?? "");
      const description = String(data.get("description") ?? "");
      const button = form.querySelector<HTMLButtonElement>(
        "button[type='submit']",
      );
      if (!button) return;
      void run(button, async () => {
        const result = await createCollection({ title, description });
        if (!result.collection)
          throw new Error("That collection could not be created.");
        window.location.assign(`/library/${result.collection.slug}`);
      });
    });

  root
    .querySelector<HTMLFormElement>("[data-update-collection]")
    ?.addEventListener("submit", (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      if (!(form instanceof HTMLFormElement)) return;
      const id = form.dataset.collectionId;
      if (!id) return;
      const data = new FormData(form);
      const button = form.querySelector<HTMLButtonElement>(
        "button[type='submit']",
      );
      if (!button) return;
      void run(button, async () => {
        await updateCollection(id, {
          title: String(data.get("title") ?? ""),
          description: String(data.get("description") ?? ""),
        });
        window.location.reload();
      });
    });

  root
    .querySelectorAll<HTMLButtonElement>("[data-unsave]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        const skillPath = button.dataset.skillPath;
        if (!skillPath) return;
        void run(button, async () => {
          await unsaveSkill(skillPath);
          window.location.reload();
        });
      });
    });

  root
    .querySelectorAll<HTMLButtonElement>("[data-remove-skill]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        const skillPath = button.dataset.skillPath;
        const id = button.dataset.collectionId;
        if (!skillPath || !id) return;
        void run(button, async () => {
          await removeSkillFromCollection(id, skillPath);
          window.location.reload();
        });
      });
    });
}
