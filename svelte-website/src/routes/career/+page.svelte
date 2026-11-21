<script lang="ts">
  import Quote from "#lib/Quote.svelte";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { year: "numeric", month: "short" });

  // --- reference request form ---
  // TODO: point this at wherever the old Astro script posted to
  //   const REFERENCE_ENDPOINT = "/api/reference-request";

  let showForm = $state(false);
  let sending = $state(false);
  let status = $state("");

  //   async function submitReference(e: SubmitEvent) {
  //     e.preventDefault();
  //     const form = e.currentTarget as HTMLFormElement;
  //     const fd = new FormData(form);

  //     // honeypot filled in => bot; pretend success
  //     if (fd.get("hp-note-b2")) {
  //       status = "Request sent.";
  //       showForm = false;
  //       return;
  //     }
  //     const email = String(fd.get("email") ?? "").trim();
  //     if (!/^\S+@\S+\.\S+$/.test(email)) {
  //       status = "Please enter a valid email.";
  //       return;
  //     }

  //     sending = true;
  //     status = "Sending…";
  //     try {
  //       const res = await fetch(REFERENCE_ENDPOINT, {
  //         method: "POST",
  //         body: fd,
  //       });
  //       if (!res.ok) throw new Error(String(res.status));
  //       status = "Request sent. Thank you!";
  //       form.reset();
  //       showForm = false;
  //     } catch {
  //       status = "Something went wrong. Please try again.";
  //     } finally {
  //       sending = false;
  //     }
  //   }
</script>

<h1 class="h1writing">Working</h1>
<p class="lede">A résumé, a bit about me, and a brief history.</p>

<section class="intro-row">
  <div class="resume-panel">
    <span class="mono-label section-label">résumé</span>

    <div class="resume-window">
      <iframe
        src="https://aselling-us.github.io/resume/ArjanEllingsonResume.pdf#toolbar=0&navpanes=0"
        title="Arjan Ellingson's résumé"
        loading="lazy"
      ></iframe>
    </div>

    <a
      class="resume-link mono-label"
      href="https://aselling-us.github.io/resume/ArjanEllingsonResume.pdf"
      target="_blank"
      rel="noopener noreferrer"
    >
      open full résumé ↗
    </a>

    <div class="reference-box">
      <button
        type="button"
        id="reference-toggle"
        class="reference-cta"
        hidden={showForm}
        onclick={() => (showForm = true)}
      >
        Request Professional References
      </button>

      <form
        class="reference-form"
        id="reference-form"
        novalidate
        hidden={!showForm}
        onsubmit={submitReference}
      >
        <input
          class="reference-input"
          id="reference-name"
          name="name"
          type="text"
          placeholder="Your name (optional)"
          autocomplete="name"
        />
        <input
          class="reference-input"
          id="reference-email"
          name="email"
          type="email"
          placeholder="you@example.com"
          autocomplete="email"
          required
        />
        <input
          class="reference-input"
          id="reference-message"
          name="message"
          type="text"
          placeholder="Company (optional)"
        />
        <!-- honeypot: see SubscribeForm.astro for why it's named/hidden this way -->
        <input
          class="reference-hp"
          name="hp-note-b2"
          type="text"
          tabindex="-1"
          autocomplete="off"
          aria-hidden="true"
          data-1p-ignore="true"
          data-lpignore="true"
          data-bwignore="true"
          data-form-type="other"
        />
        <div class="reference-actions">
          <button type="submit" id="reference-submit" disabled={sending}>
            send request
          </button>
          <button
            type="button"
            id="reference-cancel"
            onclick={() => {
              showForm = false;
              status = "";
            }}
          >
            cancel
          </button>
        </div>
      </form>

      <p
        class="reference-status mono-label"
        id="reference-status"
        role="status"
        aria-live="polite"
      >
        {status}
      </p>
    </div>

    <!-- Astro leftover; in Svelte this would be {#if import.meta.env.DEV}...{/if}
    <div class="dev-reference-test">
      <span class="mono-label">dev: test reference request email</span>
      <button type="button" id="send-reference-test" class="dev-btn">
        send test email to me
      </button>
    </div>
    -->
  </div>

  <div class="about-panel">
    <span class="mono-label section-label">about</span>

    <p>
      I've always been passionate about figuring out how technology can help us
      create better versions of ourselves. Whether this includes productivity
      tools, avoiding addictive pitfalls, or creating QOL improvements, I want
      to create tools (not limited to software) that help people live deeper,
      introspective and more present lives.
    </p>
    <p>
      This philosophy has guided my career, from education to defense and
      wherever the future leads me. My current work as a textbook developer for
      Kontinua has inspired me to pursue life-long learning in support of
      education. At Redwire, I have been able to alter processes that affect the
      entire company for the better. On my own time, I have reorganized my own
      life to be more efficient and minimize distractions around me.
    </p>

    <Quote cite="— Søren Kierkegaard">
      Life can only be understood backwards; but it must be lived forwards.
    </Quote>

    <p>
      In my efforts to stay off of Social Networking Services, I have gradually
      eliminated certain apps including LinkedIn. While it is a useful tool, I
      have replicated a similar functionality here. The following section is a
      chronological history of my professional work experience.
    </p>
  </div>
</section>

<section>
  <div class="history-header">
    <span class="mono-label section-label">history</span>
  </div>

  {#if data.roles.length}
    <ul class="history-list">
      {#each data.roles as role (role.slug)}
        <li class="history-item">
          {#if role.logo}
            <img
              class="history-logo"
              src={role.logo}
              alt="{role.company} logo"
              width="56"
              height="56"
            />
          {/if}
          <div class="history-main">
            <div class="history-main">
              <div class="history-head">
                <h3 class="history-role">{role.role}</h3>
                <span class="history-company">
                  {#if role.companyUrl}
                    <a
                      href={role.companyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {role.company}
                    </a>
                  {:else}
                    {role.company}
                  {/if}
                </span>
              </div>

              <div class="history-meta mono-label">
                <span>
                  {fmt(role.startDate)} – {role.endDate
                    ? fmt(role.endDate)
                    : "Present"}
                </span>
                {#if role.location}<span>{role.location}</span>{/if}
              </div>

              <div class="prose">{@html role.html}</div>

              {#if role.tags.length}
                <div class="tag-list">
                  {#each role.tags as tag}
                    <span class="tag">{tag}</span>
                  {/each}
                </div>
              {/if}
            </div>
          </div>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="empty-state">No history to show yet.</p>
  {/if}
</section>

<style>
  .h1writing {
    font-family: var(--font-writing);
  }
  .lede {
    color: var(--color-text-dim);
  }
  .section-label {
    color: var(--color-highlight-bright);
    border-bottom: 1px solid var(--color-hairline);
    padding-bottom: var(--space-1);
    margin: 0 0 var(--space-3);
    font-size: 0.7rem;
    font-weight: 400;
    display: block;
  }
  section {
    margin-top: var(--space-4);
  }
  .history-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-3);
    flex-wrap: wrap;
    border-bottom: 1px solid var(--color-hairline);
    padding-bottom: var(--space-1);
    margin: 0 0 var(--space-3);
  }
  .history-header .section-label {
    border-bottom: none;
    padding-bottom: 0;
    margin: 0;
  }

  code {
    font-family: var(--font-mono);
    font-size: 0.85em;
    background: var(--color-bg-inset);
    padding: 0.1rem 0.3rem;
    border-radius: 2px;
  }

  /* résumé + about, side by side */
  .intro-row {
    display: flex;
    align-items: flex-start;
    gap: var(--space-4);
    margin-top: var(--space-4);
    flex-wrap: wrap;
  }

  .resume-panel {
    flex: 0 0 410px;
  }
  .resume-window {
    border: 1px solid var(--color-hairline);
    background: var(--color-bg-inset);
    padding: 6px;
    aspect-ratio: 8.5 / 11;
  }
  .resume-window iframe {
    width: 100%;
    height: 100%;
    display: block;
    border: 0;
    background: #fff;
  }
  .resume-link {
    display: inline-block;
    margin-top: var(--space-1);
    color: var(--color-accent-bright);
  }
  .resume-link:hover {
    color: var(--color-highlight-bright);
  }

  .about-panel {
    flex: 1 1 320px;
    min-width: 260px;
  }
  .about-panel p {
    color: var(--color-text-dim);
    max-width: 60ch;
  }

  /* career history list */
  .history-list {
    list-style: none;
    padding: 0;
    margin-top: var(--space-3);
  }
  .history-item {
    display: flex;
    gap: var(--space-3);
    align-items: flex-start;
    padding: 1.75rem 0;
    border-bottom: 1px solid var(--color-hairline);
  }
  .history-logo {
    flex-shrink: 0;
    width: 56px;
    height: 56px;
    object-fit: cover;
    border: 1px solid var(--color-hairline);
    background: #fff;
  }
  .history-main {
    flex: 1;
    min-width: 0;
  }
  .history-head {
    display: flex;
    align-items: baseline;
    gap: 0.6rem;
    flex-wrap: wrap;
  }
  .history-role {
    font-family: var(--font-display);
    font-size: 1.15rem;
    font-weight: 400;
    color: var(--color-text);
    margin: 0;
  }
  .history-company {
    color: var(--color-accent-bright);
    font-size: 0.95rem;
  }
  .history-company a:hover {
    color: var(--color-highlight-bright);
  }
  .history-meta {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    margin-top: 0.3rem;
  }

  .prose {
    margin-top: 0.6rem;
    max-width: 65ch;
  }
  .prose :global(p) {
    margin: 0 0 0.6rem;
    color: var(--color-text-dim);
  }
  .prose :global(ul) {
    margin: 0 0 0.6rem;
    padding-left: 1.2rem;
    color: var(--color-text-dim);
  }
  .prose :global(li) {
    margin: 0.2rem 0;
  }
  .prose :global(a) {
    color: var(--color-accent-bright);
  }
  .prose :global(a:hover) {
    color: var(--color-highlight-bright);
  }
  /* `==highlight==` markdown — same gold treatment as the blog */
  .prose :global(mark) {
    background: var(--color-highlight-bright);
    color: var(--color-bg);
    padding: 0.05em 0.2em;
    border-radius: 2px;
  }
  /* a link inside a highlight would otherwise be accent-on-highlight (and
     vanish on hover) — keep it legible, underline marks it as a link */
  .prose :global(mark a),
  .prose :global(mark a:hover) {
    color: inherit;
    text-decoration: underline;
  }

  .tag-list {
    list-style: none;
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    padding: 0;
    margin: 0.5rem 0 0;
  }
  .tag {
    font-family: var(--font-mono);
    font-size: 0.65rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--color-highlight-bright);
    border: 1px solid var(--color-highlight-bright);
    border-radius: 9999px;
    padding: 0.2rem 0.75rem;
    line-height: 1;
    transition:
      background-color 0.15s ease,
      color 0.15s ease;
  }
  .tag:hover {
    background: var(--color-highlight-bright);
    color: var(--color-bg);
  }

  .empty-state {
    color: var(--color-text-dim);
    margin-top: var(--space-3);
  }

  /* request professional references */
  .reference-box {
    margin-top: var(--space-3);
  }
  .reference-cta {
    display: block;
    width: fit-content;
    margin: 0 auto;
    background: var(--color-highlight-bright);
    border: none;
    color: var(--color-bg);
    font-family: var(--font-mono);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 0.6rem 1rem;
    cursor: pointer;
  }
  .reference-cta:hover {
    opacity: 0.9;
  }
  /* [hidden] alone loses to the `display` rules (same specificity, source
     order breaks the tie) — spell it out so the toggle actually hides things */
  .reference-cta[hidden] {
    display: none;
  }
  .reference-form {
    display: grid;
    gap: 0.6rem;
    max-width: 420px;
  }
  .reference-form[hidden] {
    display: none;
  }
  .reference-input {
    width: 100%;
    background: var(--color-bg-inset);
    border: 1px solid var(--color-hairline-bright);
    color: var(--color-text);
    font: inherit;
    font-size: 0.9rem;
    padding: 0.5rem 0.65rem;
  }
  .reference-input:focus-visible {
    outline: 2px solid var(--color-highlight-bright);
    outline-offset: 1px;
  }
  /* honeypot: off-screen rather than display:none, which unsophisticated
     bots often specifically check for and skip filling */
  .reference-hp {
    position: absolute;
    left: -9999px;
    width: 1px;
    height: 1px;
    overflow: hidden;
  }
  .reference-actions {
    display: flex;
    gap: 0.6rem;
  }
  .reference-actions button[type="submit"] {
    background: var(--color-highlight-bright);
    border: none;
    color: var(--color-bg);
    font-family: var(--font-mono);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 0.5rem 0.9rem;
    cursor: pointer;
  }
  .reference-actions button[type="submit"]:disabled {
    opacity: 0.6;
    cursor: default;
  }
  .reference-actions button[type="button"] {
    background: none;
    border: 1px solid var(--color-hairline-bright);
    color: var(--color-text-dim);
    font-family: var(--font-mono);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 0.5rem 0.9rem;
    cursor: pointer;
  }
  .reference-actions button[type="button"]:hover {
    color: var(--color-highlight-bright);
    border-color: var(--color-highlight);
  }
  .reference-status {
    min-height: 1.2em;
    margin: 0.6rem 0 0;
    color: var(--color-text-dim);
  }
  .dev-reference-test {
    margin-top: 0.6rem;
    padding: var(--space-2);
    border: 1px dashed var(--color-hairline-bright);
  }
  .dev-reference-test :global(.dev-btn) {
    margin-top: 0.5rem;
  }

  @media (max-width: 640px) {
    .intro-row {
      flex-direction: column;
    }
    .resume-panel {
      flex: 1 1 100%;
      width: 100%;
      max-width: 260px;
    }
    .history-item {
      flex-direction: column;
    }
  }

  /* ---- formerly <style is:global> (Astro-only syntax) ----
     Svelte allows one <style> block per component and scopes it by default,
     so global rules are wrapped in :global(...) instead. */
  :global(.dev-btn) {
    background: none;
    border: 1px dashed var(--color-hairline-bright);
    color: var(--color-text-dim);
    padding: 0.25rem 0.6rem;
    cursor: pointer;
  }
  :global(.dev-btn:hover) {
    color: var(--color-highlight-bright);
    border-color: var(--color-highlight);
  }
  :global(.history-edit) {
    margin-left: 0.2rem;
    padding: 0.1rem 0.45rem;
  }

  :global(.career-editor) {
    width: min(720px, 95vw);
    max-height: 90vh;
    overflow-y: auto;
    background: var(--color-bg-elevated);
    color: var(--color-text);
    border: 1px solid var(--color-hairline-bright);
    border-radius: 4px;
    padding: var(--space-3);
  }
  :global(.career-editor::backdrop) {
    background: rgba(10, 13, 18, 0.75);
  }
  :global(.career-editor form) {
    display: grid;
    gap: 0.6rem;
  }
  :global(.career-editor .row) {
    display: flex;
    gap: 0.6rem;
    align-items: flex-end;
  }
  :global(.career-editor .row > *) {
    flex: 1;
  }
  :global(.career-editor input),
  :global(.career-editor textarea) {
    width: 100%;
    background: var(--color-bg-inset);
    border: 1px solid var(--color-hairline-bright);
    color: var(--color-text);
    font: inherit;
    font-size: 0.9rem;
    padding: 0.4rem 0.55rem;
  }
  :global(.career-editor textarea) {
    font-family: var(--font-mono);
    font-size: 0.8rem;
    line-height: 1.5;
  }
  :global(.career-editor .date-label),
  :global(.career-editor .tags-label),
  :global(.career-editor .logo-label) {
    display: grid;
    gap: 0.25rem;
  }
  :global(.career-editor input[type="file"]) {
    border-style: dashed;
  }
  :global(.career-editor button[type="submit"]) {
    background: var(--color-highlight);
    border: none;
    color: var(--color-bg);
    font-family: var(--font-mono);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 0.45rem 0.7rem;
    cursor: pointer;
  }
  :global(.career-editor button[type="submit"]:hover) {
    background: var(--color-highlight-bright);
  }
  :global(.career-editor #career-cancel) {
    background: none;
    border: 1px solid var(--color-hairline-bright);
    color: var(--color-text-dim);
    font-family: var(--font-mono);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 0.45rem 0.7rem;
    cursor: pointer;
  }
  :global(.career-editor #career-cancel:hover) {
    color: var(--color-highlight-bright);
    border-color: var(--color-highlight);
  }
</style>
