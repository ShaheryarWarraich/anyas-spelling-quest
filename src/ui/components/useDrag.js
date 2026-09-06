import { useRef, useState } from 'react';
// Pointer-based drag helper for tablets. onDrop(item, targetEl) with the element under the finger.
export function useDrag(onDrop) {
  const [drag, setDrag] = useState(null); // {item, x, y, label}
  const ref = useRef(null);
  const start = (item, label) => e => {
    e.preventDefault(); try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
    setDrag({ item, label, x: e.clientX, y: e.clientY });
  };
  const move = e => { if (drag) setDrag(d => ({ ...d, x: e.clientX, y: e.clientY })); };
  const end = e => {
    if (!drag) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const target = el && el.closest('[data-drop]');
    onDrop(drag.item, target ? target.dataset.drop : null);
    setDrag(null);
  };
  return { drag, start, handlers: { onPointerMove: move, onPointerUp: end, onPointerCancel: end } };
}
