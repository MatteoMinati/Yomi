// Yomi's small Motion JS adapter. The package is bundled with esbuild so the
// existing Python server can continue to serve a plain static PWA.

import { animate, stagger as motionStagger } from "motion";

const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export function enter(node, options = {}) {
  if (!node || reduced) return null;
  const { delay = 0, duration = 360, y = 10, scale = 0.985 } = options;
  return animate(node,
    { opacity: [0, 1], y: [y, 0], scale: [scale, 1] },
    { duration: duration / 1000, delay: delay / 1000, easing: [0.16, 1, 0.3, 1] }
  );
}

export function stagger(nodes, options = {}) {
  if (reduced) return;
  const { delay = 0, duration = 360, y = 10, scale = 0.985 } = options;
  return animate(nodes,
    { opacity: [0, 1], y: [y, 0], scale: [scale, 1] },
    { duration: duration / 1000, delay: motionStagger(0.038, { startDelay: delay / 1000 }), easing: [0.16, 1, 0.3, 1] }
  );
}

export function press(node) {
  if (!node || reduced) return;
  return animate(node, { scale: [1, 0.97, 1] }, { duration: 0.18, easing: "ease-out" });
}

export function success(node) {
  if (!node || reduced) return;
  return animate(node, { scale: [1, 1.03, 1] }, { duration: 0.26, easing: "ease-out" });
}
