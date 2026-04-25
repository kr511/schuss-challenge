export const byId = (id, root = document) => root.getElementById(id);
export const qs = (selector, root = document) => root.querySelector(selector);
export const qsa = (selector, root = document) => Array.from(root.querySelectorAll(selector));

export function setText(target, value) {
  if (!target) return;
  target.textContent = value;
}

export function setHtml(target, value) {
  if (!target) return;
  target.innerHTML = value;
}

export function toggleClass(target, className, force) {
  if (!target) return false;
  target.classList.toggle(className, force);
  return target.classList.contains(className);
}

export function on(target, eventName, handler, options) {
  if (!target || typeof target.addEventListener !== 'function') return () => {};
  target.addEventListener(eventName, handler, options);
  return () => target.removeEventListener(eventName, handler, options);
}

export function createEl(tagName, options = {}) {
  const node = document.createElement(tagName);
  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  if (options.html !== undefined) node.innerHTML = options.html;
  return node;
}

export const DomUtils = { byId, qs, qsa, setText, setHtml, toggleClass, on, createEl };
