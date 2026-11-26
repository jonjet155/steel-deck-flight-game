// input.js — keyboard + mouse state.
export const Input = {
  keys: {},
  mouseX: 0, mouseY: 0, clicked: false, clickX: 0, clickY: 0,
  init(canvas) {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
      if (e.code === 'KeyM') window.__toggleMute && window.__toggleMute();
    });
    window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    canvas.addEventListener('mousemove', (e) => {
      const r = canvas.getBoundingClientRect();
      this.mouseX = e.clientX - r.left; this.mouseY = e.clientY - r.top;
    });
    canvas.addEventListener('click', (e) => {
      const r = canvas.getBoundingClientRect();
      this.clickX = e.clientX - r.left; this.clickY = e.clientY - r.top;
      this.clicked = true;
    });
  },
  down(...codes) { return codes.some((c) => this.keys[c]); },
  consumeClick() { const c = this.clicked; this.clicked = false; return c; },
};
