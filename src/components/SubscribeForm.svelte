<script lang="ts">
  // Public "get new posts by email" signup, backed by the Cloudflare Worker in
  // worker/ (see worker/README.md). Double opt-in: submitting here only queues
  // a confirmation email — the address isn't added to the send list until the
  // link in that email is clicked.
  import { WORKER_URL } from "#lib/subscribe-worker.mjs";

  let sending = $state(false);
  let status = $state("");

  async function subscribe(e: SubmitEvent) {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const emailInput = form.elements.namedItem("email") as HTMLInputElement;

    if (!emailInput.checkValidity()) {
      status = "enter a valid email address";
      return;
    }

    sending = true;
    status = "sending…";

    try {
      const hp = form.elements.namedItem("hp-note-a1") as HTMLInputElement;
      const res = await fetch(new URL("/subscribe", WORKER_URL), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailInput.value.trim(),
          website: hp.value, // honeypot, checked by the worker
        }),
      });

      if (!res.ok) throw new Error(`status ${res.status}`);

      status = "check your email to confirm";
      form.reset();
    } catch {
      status = "something went wrong — try again in a moment";
    } finally {
      sending = false;
    }
  }

  // --- dev-only: send a real test copy of the confirmation email ---
  let testTo = $state("");
  let testSending = $state(false);

  async function sendConfirmTest() {
    const to = testTo.trim();
    if (!to) {
      alert("Enter an email address to send the test to.");
      return;
    }

    testSending = true;
    try {
      const res = await fetch("/__test-confirmation-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to }),
      });
      if (!res.ok) {
        const { error } = await res
          .json()
          .catch(() => ({ error: res.statusText }));
        alert(`Could not send test email: ${error}`);
        return;
      }
      if (
        confirm(
          `Test confirmation email sent to ${to}. Its "Confirm subscription" link is a placeholder and won't actually confirm anything. Open Gmail to check?`,
        )
      ) {
        window.open("https://mail.google.com/mail/u/0/#inbox", "_blank");
      }
    } finally {
      testSending = false;
    }
  }
</script>

<form class="subscribe-form" id="subscribe-form" novalidate onsubmit={subscribe}>
  <span class="mono-label subscribe-label">get new posts by email</span>
  <div class="subscribe-row">
    <input
      class="subscribe-email"
      id="subscribe-email"
      name="email"
      type="email"
      placeholder="you@example.com"
      autocomplete="email"
      required
    />
    <!-- honeypot: invisible to real visitors, left empty by them; bots that
         blindly fill every field trip this and get a silent no-op.
         Deliberately NOT named "website"/"url"/"company" etc — those names
         cause password managers to auto-populate the field on real visitors,
         silently killing their signup while the form still reports success.
         The data-*ignore attributes are exclusion hints those managers respect. -->
    <input
      class="subscribe-hp"
      name="hp-note-a1"
      type="text"
      tabindex="-1"
      autocomplete="off"
      aria-hidden="true"
      data-1p-ignore="true"
      data-lpignore="true"
      data-bwignore="true"
      data-form-type="other"
    />
    <button type="submit" id="subscribe-submit" disabled={sending}>
      subscribe
    </button>
  </div>
  <p
    class="subscribe-status mono-label"
    id="subscribe-status"
    role="status"
    aria-live="polite"
  >
    {status}
  </p>
</form>

{#if import.meta.env.DEV}
  <div class="dev-confirm-test">
    <span class="mono-label">dev: test confirmation email</span>
    <div class="dev-confirm-test-row">
      <input
        type="email"
        bind:value={testTo}
        placeholder="dummy@address.com"
        title="Address to send a real test copy of the confirmation email to"
      />
      <button
        type="button"
        class="dev-btn"
        disabled={testSending}
        onclick={sendConfirmTest}
      >
        {testSending ? "sending…" : "send test"}
      </button>
    </div>
  </div>
{/if}

<style>
  .subscribe-form {
    margin: var(--space-3) 0;
    padding: var(--space-3);
    border: 1px solid var(--color-hairline);
    background: var(--color-bg-elevated);
  }

  .subscribe-label {
    display: block;
    margin-bottom: 0.6rem;
  }

  .subscribe-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
  }

  .subscribe-email {
    flex: 1;
    min-width: 200px;
    background: var(--color-bg-inset);
    border: 1px solid var(--color-hairline-bright);
    color: var(--color-text);
    font: inherit;
    font-size: 0.9rem;
    padding: 0.5rem 0.65rem;
  }
  .subscribe-email:focus-visible {
    outline: 2px solid var(--color-highlight-bright);
    outline-offset: 1px;
  }

  /* honeypot: off-screen rather than display:none, which unsophisticated
     bots often specifically check for and skip filling */
  .subscribe-hp {
    position: absolute;
    left: -9999px;
    width: 1px;
    height: 1px;
    overflow: hidden;
  }

  .subscribe-form button[type="submit"] {
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
  .subscribe-form button[type="submit"]:disabled {
    opacity: 0.6;
    cursor: default;
  }

  .subscribe-status {
    min-height: 1.2em;
    margin: 0.6rem 0 0;
    color: var(--color-text-dim);
  }

  .dev-confirm-test {
    margin: 0.6rem 0 var(--space-3);
    padding: var(--space-2);
    border: 1px dashed var(--color-hairline-bright);
  }
  .dev-confirm-test-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
    margin-top: 0.5rem;
  }
  .dev-confirm-test-row input[type="email"] {
    flex: 1;
    min-width: 200px;
    background: var(--color-bg-inset);
    border: 1px solid var(--color-hairline-bright);
    color: var(--color-text);
    font: inherit;
    font-size: 0.9rem;
    padding: 0.5rem 0.65rem;
  }
  .dev-btn {
    background: none;
    border: 1px dashed var(--color-hairline-bright);
    color: var(--color-text-dim);
    padding: 0.25rem 0.6rem;
    cursor: pointer;
  }
  .dev-btn:hover {
    color: var(--color-highlight-bright);
    border-color: var(--color-highlight);
  }
  .dev-btn:disabled {
    opacity: 0.5;
    cursor: default;
  }
</style>