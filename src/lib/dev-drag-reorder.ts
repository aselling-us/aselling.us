// Dev-only, dependency-free drag-to-reorder for a row/grid of thumbnail
// elements — used by the photo galleries on /travels (places) and /books
// ("From The Margins"). Never imported in a way that ships to the built
// site; callers gate their own markup behind import.meta.env.DEV.
//
// Built on Pointer Events, not the native HTML5 Drag and Drop API
// (draggable="true" + dragstart/dragover/drop). A first version used native
// DnD and it was bad: confirmed with a real browser that a realistic drag
// gesture (mouse down, move, up — what Playwright's own dragTo() simulates,
// same as a trackpad) doesn't reliably fire the browser's native drag
// sequence at all; only synthetic DragEvent objects dispatched directly in
// JS did. Native DnD is also stuck with the browser's own drag-ghost image
// and no control over the animation. Pointer events fire from ordinary
// mouse/touch input every time and let this fully control the visuals.
//
// `root` is listened on directly rather than each container individually,
// so this also works for markup that gets torn down and rebuilt after the
// fact (e.g. a Leaflet popup re-inserted from an HTML string every time it
// opens) — as long as `root` itself (document, typically) stays alive,
// closest() lookups find whichever container/item currently exists in the
// DOM, no re-wiring needed.
//
// A small movement threshold gates when a press actually becomes a drag, so
// a plain click still reaches other handlers on the item (e.g. the map
// popup's click-to-expand) when the pointer never really moved.
const DRAG_THRESHOLD_PX = 5;

interface PressState {
  item: HTMLElement;
  container: HTMLElement;
  pointerId: number;
  startX: number;
  startY: number;
  placeholder: HTMLElement | null; // set once the press turns into an actual drag
  originX: number;
  originY: number;
}

export function wireDragReorder(
  root: ParentNode,
  containerSelector: string,
  itemSelector: string,
  onReorder: (container: HTMLElement, keys: string[]) => void
): void {
  let press: PressState | null = null;

  const closestEl = (t: EventTarget | null, selector: string) =>
    t instanceof Element ? t.closest<HTMLElement>(selector) : null;

  function beginDrag(clientX: number, clientY: number) {
    if (!press) return;
    const { item, container } = press;
    const rect = item.getBoundingClientRect();

    const placeholder = document.createElement('div');
    placeholder.className = 'drag-reorder-placeholder';
    placeholder.style.width = `${rect.width}px`;
    placeholder.style.height = `${rect.height}px`;
    item.after(placeholder);

    item.classList.add('is-dragging');
    Object.assign(item.style, {
      position: 'fixed',
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      zIndex: '1000',
      pointerEvents: 'none',
    });

    press.placeholder = placeholder;
    press.originX = rect.left;
    press.originY = rect.top;
    press.startX = clientX;
    press.startY = clientY;
  }

  function resetItemStyle(item: HTMLElement) {
    item.classList.remove('is-dragging');
    item.style.position = '';
    item.style.left = '';
    item.style.top = '';
    item.style.width = '';
    item.style.height = '';
    item.style.zIndex = '';
    item.style.pointerEvents = '';
  }

  function endDrag() {
    if (!press) return;
    const { item, container, placeholder } = press;
    press = null;
    if (!placeholder) return; // never crossed the threshold — treat as a plain click
    placeholder.replaceWith(item);
    resetItemStyle(item);
    const keys = Array.from(container.querySelectorAll<HTMLElement>(itemSelector)).map(
      (el) => el.dataset.key ?? ''
    );
    onReorder(container, keys);
  }

  root.addEventListener('pointerdown', (e) => {
    const ev = e as PointerEvent;
    if (ev.button !== 0) return;
    const item = closestEl(ev.target, itemSelector);
    const container = item?.closest<HTMLElement>(containerSelector);
    if (!item || !container) return;
    press = {
      item,
      container,
      pointerId: ev.pointerId,
      startX: ev.clientX,
      startY: ev.clientY,
      placeholder: null,
      originX: 0,
      originY: 0,
    };
    item.setPointerCapture(ev.pointerId);
  });

  root.addEventListener('pointermove', (e) => {
    if (!press || press.pointerId !== (e as PointerEvent).pointerId) return;
    const ev = e as PointerEvent;

    if (!press.placeholder) {
      const moved = Math.hypot(ev.clientX - press.startX, ev.clientY - press.startY);
      if (moved < DRAG_THRESHOLD_PX) return;
      beginDrag(ev.clientX, ev.clientY);
    }

    ev.preventDefault();
    const { item, container, placeholder, originX, originY, startX, startY } = press;
    item.style.left = `${originX + (ev.clientX - startX)}px`;
    item.style.top = `${originY + (ev.clientY - startY)}px`;

    const under = document.elementFromPoint(ev.clientX, ev.clientY);
    const target = closestEl(under, itemSelector);
    if (!target || target === item || target.parentElement !== container) return;
    const rect = target.getBoundingClientRect();
    const before = ev.clientX < rect.left + rect.width / 2;
    container.insertBefore(placeholder!, before ? target : target.nextSibling);
  });

  root.addEventListener('pointerup', (e) => {
    if (!press || press.pointerId !== (e as PointerEvent).pointerId) return;
    endDrag();
  });
  root.addEventListener('pointercancel', (e) => {
    if (!press || press.pointerId !== (e as PointerEvent).pointerId) return;
    endDrag();
  });
}
