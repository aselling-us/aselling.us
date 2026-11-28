<script lang="ts">
  import { enhance } from "$app/forms";
  import { refreshAll } from "$app/navigation";
  import {
    Trash,
    FileImage,
    LetterB,
    Italic,
    Quote,
    FileXCorner,
  } from "@lucide/svelte";
  import type { Post } from "#lib/types.ts";
  import { dev } from "$app/env";
  import { tick } from "svelte";

  import { createTwoFilesPatch } from "diff";
  import { slugify } from "#lib/slugify.ts";
  import { html } from "diff2html";
  import "diff2html/bundles/css/diff2html.min.css";

  let postForm!: HTMLFormElement;
  let diffDialog!: HTMLDialogElement;
  let diffHtml = $state("");
  let filenameChange = $state("");
  let metadataChanges = $state<
    { field: string; before: string; after: string }[]
  >([]);
  function reviewChanges() {
    if (!editingPost) return;
    const form = new FormData(postForm);
    const value = (name: string) => String(form.get(name) ?? "");

    metadataChanges = [
      { field: "Title", before: editingPost.title, after: value("title") },
      {
        field: "Date",
        before: formatDateForInput(editingPost.date),
        after: value("date"),
      },
      {
        field: "Description",
        before: editingPost.description ?? "",
        after: value("description"),
      },
      {
        field: "Tags",
        before: editingPost.tags.join(", "),
        after: value("tags")
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
          .join(", "),
      },
      {
        field: "Cover caption",
        before: editingPost.coverCaption ?? "",
        after: value("covercaption"),
      },
      {
        field: "Draft",
        before: editingPost.draft ? "Yes" : "No",
        after: form.get("draft") === "on" ? "Yes" : "No",
      },
    ].filter((change) => change.before !== change.after);

    const cover = form.get("cover");

    if (cover instanceof File && cover.size > 0) {
      metadataChanges.push({
        field: "Cover",
        before: editingPost.cover ? "Current cover" : "None",
        after: cover.name,
      });
    }
    const title = String(new FormData(postForm).get("title") ?? "");
    const oldFilename = `${editingPost.slug}.md`;
    const newFilename = `${slugify(title)}.md`;

    filenameChange =
      oldFilename !== newFilename ? `${oldFilename} → ${newFilename}` : "";

    if (editingPost.body === content) {
      diffHtml = "";
    } else {
      const patch = createTwoFilesPatch(
        oldFilename,
        newFilename,
        editingPost.body,
        content,
      );

      diffHtml = html(patch, {
        outputFormat: "side-by-side",
        drawFileList: false,
        matching: "lines",
      });
    }

    diffDialog.showModal();
  }
  function confirmUpdate() {
    diffDialog.close();
    postForm.requestSubmit();
  }

  let {
    popover = $bindable<HTMLElement | null>(null),
    editingPost = $bindable<Post | null>(null),
  } = $props();

  function formatDateForInput(date: string | Date): string {
    return new Date(date).toISOString().split("T")[0];
  }

  let content = $state("");
  let removeCover = $state(false);

  $effect(() => {
    editingPost;
    removeCover = false;
    content = editingPost?.body ?? "";
  });

  let bodyInput!: HTMLTextAreaElement;

  async function makeBold() {
    const start = bodyInput.selectionStart;
    const end = bodyInput.selectionEnd;
    const selected = content.slice(start, end);

    content = content.slice(0, start) + `**${selected}**` + content.slice(end);

    await tick();
    bodyInput.focus();
    bodyInput.setSelectionRange(start + 2, end + 2);
  }
  async function makeItalics() {
    const start = bodyInput.selectionStart;
    const end = bodyInput.selectionEnd;
    const selected = content.slice(start, end);

    content = content.slice(0, start) + `*${selected}*` + content.slice(end);

    await tick();
    bodyInput.focus();
    bodyInput.setSelectionRange(start + 1, end + 1);
  }
  async function makeQuoted() {
    const start = bodyInput.selectionStart;
    const end = bodyInput.selectionEnd;

    const lineStart =
      start === 0 ? 0 : content.lastIndexOf("\n", start - 1) + 1;

    // Don't quote the next line if the selection ends just after a newline.
    const quoteEnd = end > start && content[end - 1] === "\n" ? end - 1 : end;

    const selected = content.slice(lineStart, quoteEnd);
    const quoted = selected
      .split("\n")
      .map((line) => `> ${line}`)
      .join("\n");

    content = content.slice(0, lineStart) + quoted + content.slice(quoteEnd);

    await tick();
    bodyInput.focus();
    bodyInput.setSelectionRange(
      start + 2,
      end + quoted.length - selected.length,
    );
  }
  async function handleKeydown(
    event: KeyboardEvent & { currentTarget: HTMLTextAreaElement },
  ) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "b") {
      event.preventDefault();
      await makeBold();
    } else if (
      (event.ctrlKey || event.metaKey) &&
      event.key.toLowerCase() === "i"
    ) {
      event.preventDefault();
      await makeItalics();
    }
  }

  let imageInput!: HTMLInputElement;

  async function insertImage() {
    const file = imageInput.files?.[0];
    if (!file) return;

    const start = bodyInput.selectionStart;
    const end = bodyInput.selectionEnd;
    const markdown = `![${file.name}](./${encodeURIComponent(file.name)})`;

    content = content.slice(0, start) + markdown + content.slice(end);

    await tick();
    bodyInput.focus();
    bodyInput.setSelectionRange(
      start + markdown.length,
      start + markdown.length,
    );
  }
</script>

<div
  id="new-post-popover"
  bind:this={popover}
  popover="manual"
  class="editor-popover"
>
  <!-- Keyed on slug so the form resets cleanly when switching between posts -->
  {#if dev}
    {#key editingPost?.slug ?? "new"}
      <form
        bind:this={postForm}
        id="post-form"
        method="POST"
        action={editingPost ? "?/updatePost" : "?/createPost"}
        enctype="multipart/form-data"
        use:enhance={() => {
          return async ({ result, update }) => {
            if (result.type === "success") {
              popover?.hidePopover();
              editingPost = null;
              await update();
              await refreshAll();
            } else {
              // Catches validation errors (result.type === 'failure') or 500s ('error')
              console.error("Action result:", result);
              await update();
            }
          };
        }}
      >
        <div class="popover-header">
          <h2>
            {editingPost ? `Edit: ${editingPost.title}` : "Create New Post"}
          </h2>
          <button
            type="button"
            onclick={() => popover?.hidePopover()}
            aria-label="Close">✕</button
          >
        </div>

        <!-- Pass the original slug when updating so the server knows which file to edit -->
        {#if editingPost}
          <input type="hidden" name="originalTitle" value={editingPost.title} />
          <input
            type="hidden"
            name="originalDraft"
            value={String(editingPost.draft)}
          />
          <input
            type="hidden"
            name="existingCover"
            value={editingPost.cover ?? ""}
          />
        {/if}

        <div class="row">
          <label class="required-label">
            Draft
            <input
              name="draft"
              type="checkbox"
              checked={editingPost ? editingPost.draft : true}
            />
          </label>
          <label class="required-label">
            Title
            <input
              type="text"
              name="title"
              value={editingPost?.title ?? ""}
              placeholder="Post title..."
              required
            />
          </label>
        </div>
        <div class="row">
          <label class="required-label">
            Date
            <input
              type="date"
              name="date"
              value={editingPost ? formatDateForInput(editingPost.date) : ""}
              required
            />
          </label>

          <div>
            <label>
              Cover Image
              {#if editingPost?.cover}
                <img
                  src={editingPost.cover}
                  alt={editingPost.coverCaption ?? "Current cover"}
                  style="max-width: 160px; border-radius: 4px;"
                />
              {/if}
              <input
                type="file"
                name="cover"
                accept=".png,.jpg,.jpeg,.webp,.avif,image/*"
              />
            </label>

            {#if editingPost?.cover}
              <button
                type="button"
                aria-label="Remove cover"
                aria-pressed={removeCover}
                onclick={() => (removeCover = !removeCover)}
              >
                <FileXCorner size={28} color="#2589C8" strokeWidth={1.25} />
              </button>

              {#if removeCover}
                <input type="hidden" name="removeCover" value="on" />
                <span>Cover will be removed. Click again to undo.</span>
              {/if}
            {/if}
          </div>
        </div>
        <label>
          Cover Caption
          <input
            type="text"
            name="covercaption"
            value={editingPost?.coverCaption ?? ""}
            placeholder="Where does this image come from?"
          />
        </label>

        <label class="required-label">
          Post Description
          <input
            type="text"
            name="description"
            value={editingPost?.description ?? ""}
            placeholder="Short summary..."
          />
        </label>

        <label>
          Tags (comma-separated)
          <input
            type="text"
            name="tags"
            value={editingPost?.tags?.join(", ") ?? ""}
            placeholder="tag1, tag2, tag3..."
          />
        </label>

        <div class="toolkit-row">
          <button type="button" onclick={makeBold} aria-label="Bold">
            <LetterB size={24} color="#2589C8" strokeWidth={2} />
          </button>
          <button type="button" onclick={makeItalics} aria-label="Italics">
            <Italic size={24} color="#2589C8" strokeWidth={2} />
          </button>
          <button type="button" onclick={makeQuoted} aria-label="Quote">
            <Quote size={24} color="#2589C8" strokeWidth={2} />
          </button>
          <button
            type="button"
            aria-label="Insert image"
            onclick={() => imageInput.click()}
          >
            <FileImage size={24} color="#2589C8" strokeWidth={2} />
          </button>

          <input
            bind:this={imageInput}
            type="file"
            name="bodyImage"
            accept="image/*"
            hidden
            onchange={insertImage}
          />
        </div>

        <label class="required-label form-body">
          <textarea
            bind:this={bodyInput}
            bind:value={content}
            onkeydown={handleKeydown}
            name="body"
            rows="12"
            placeholder="Write your unformatted markdown here..."
            required></textarea>
        </label>

        <div class="popover-actions">
          <button type="button" onclick={() => popover?.hidePopover()}>
            Cancel
          </button>

          <!-- Only show the delete button when editingPost exists, and configure it to trigger ?/deletePost from page.Server.ts -->
          <!-- When  click <Trash />, the browser runs onclick before submitting the form. -->
          <!-- If you click OK, confirm(...) returns true, nothing prevents the default behavior, and the form submits to ?/deletePost. -->
          <!-- If you click Cancel, e.preventDefault() stops the form submission completely and keeps your editor open. -->

          {#if editingPost}
            <button
              type="submit"
              class="primary"
              onclick={(event) => {
                event.preventDefault();
                if (postForm.reportValidity()) reviewChanges();
              }}
            >
              Review Changes
            </button>
            <button
              type="submit"
              formaction="?/deletePost"
              formnovalidate
              aria-label="Delete Post"
              // confirm makes the cancel or okay
              onclick={(e) => {
                if (!confirm(`Delete "${editingPost?.title}"?`))
                  e.preventDefault();
              }}
            >
              <Trash />
            </button>
          {:else}
            <button type="submit" class="primary">Save Post</button>
          {/if}
        </div>
        <dialog bind:this={diffDialog}>
          <h2>Review changes</h2>

          {#if filenameChange}
            <p>Filename: {filenameChange}</p>
          {/if}
          {#if metadataChanges.length}
            <h3>Post details</h3>

            {#each metadataChanges as change}
              <p>
                <strong>{change.field}:</strong>
                {change.before || "(empty)"} → {change.after || "(empty)"}
              </p>
            {/each}
          {/if}
          {#if diffHtml}
            {@html diffHtml}
          {:else}
            <p>No changes to the post body.</p>
          {/if}

          <button type="button" onclick={() => diffDialog.close()}>
            Keep editing
          </button>

          <button type="button" onclick={confirmUpdate}> Update post </button>
        </dialog>
      </form>
    {/key}

    <!-- draft links and editor controls -->
  {/if}
</div>

<style>
  .editor-popover {
    width: min(650px, 92vw);
    max-height: 90vh;
    padding: 1.5rem;
    border: 1px solid #ccc;
    border-radius: 8px;
    background: #ffffff;
    color: #111;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2);
  }

  /* Dim the background when the popover is open */
  .editor-popover::backdrop {
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(2px);
  }

  .popover-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .popover-header h2 {
    margin: 0;
    font-size: 1.25rem;
  }

  #post-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  label {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
    font-weight: 600;
  }

  input[type="text"],
  input[type="date"],
  textarea {
    flex: 1; /* Stretches the input to fill remaining space in the label */
    min-width: 0; /* Prevents inputs from overflowing grid columns */
    padding: 0.55rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-family: inherit;
    font-size: 0.95rem;
  }

  /* Monospace font makes plain-text markdown easier to write */
  textarea {
    font-family:
      ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    resize: vertical;
    line-height: 1.5;
  }

  .popover-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    margin-top: 0.5rem;
  }

  button {
    padding: 0.5rem 1rem;
    border-radius: 4px;
    border: 1px solid #ccc;
    background: #f5f5f5;
    cursor: pointer;
  }

  button.primary {
    background: #111;
    color: #fff;
    border-color: #111;
  }
  .required-label::before {
    content: " *";
    color: rgb(185, 23, 23);
    display: inline;
  }
  .form-body {
    padding: 1rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-family: inherit;
    font-size: 0.95rem;
    width: 100%; /* Fills the width of its parent container */
    min-height: 150px; /* Sets a taller starting height while still allowing expansion */
  }
  dialog {
    width: min(1000px, 95vw);
    max-height: 85vh;
    overflow: auto;
  }

  dialog::backdrop {
    background: rgba(0, 0, 0, 0.5);
  }
</style>
