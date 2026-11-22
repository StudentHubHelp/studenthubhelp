import { useEffect } from 'react';

type Point = { x: number; y: number; time: number };
type Ripple = { x: number; y: number; time: number };

export function CursorEffects() {
  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const pointerQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
    if (motionQuery.matches || !pointerQuery.matches) return;

    const canvas = document.createElement('canvas');
    canvas.className = 'shh-cursor-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      canvas.remove();
      return;
    }

    let width = 0;
    let height = 0;
    let dpr = 1;
    let frame = 0;
    let lastPoint: Point | null = null;
    const trail: Point[] = [];
    const ripples: Ripple[] = [];
    const activeButtons = new Set<HTMLElement>();

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (now: number) => {
      frame = 0;
      ctx.clearRect(0, 0, width, height);

      for (let i = trail.length - 1; i >= 0; i--) {
        const point = trail[i];
        const age = now - point.time;
        const alpha = Math.max(0, 1 - age / 430) * (1 - i / Math.max(1, trail.length) * .45);
        if (alpha <= 0) {
          trail.splice(i, 1);
          continue;
        }
        const radius = 2.4 * alpha + .5;
        ctx.beginPath();
        ctx.fillStyle = 'rgba(56, 217, 245, ' + (alpha * .48) + ')';
        ctx.shadowColor = 'rgba(56, 217, 245, ' + (alpha * .7) + ')';
        ctx.shadowBlur = 13 * alpha;
        ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.shadowBlur = 0;
      for (let i = ripples.length - 1; i >= 0; i--) {
        const ripple = ripples[i];
        const progress = (now - ripple.time) / 520;
        if (progress >= 1) {
          ripples.splice(i, 1);
          continue;
        }
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(56, 217, 245, ' + ((1 - progress) * .7) + ')';
        ctx.lineWidth = 1.5 * (1 - progress) + .35;
        ctx.shadowColor = 'rgba(56, 217, 245, .55)';
        ctx.shadowBlur = 10 * (1 - progress);
        ctx.arc(ripple.x, ripple.y, 4 + progress * 20, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;

      if (trail.length || ripples.length) frame = window.requestAnimationFrame(draw);
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(draw);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      const point = { x: event.clientX, y: event.clientY, time: performance.now() };
      if (!lastPoint || Math.hypot(point.x - lastPoint.x, point.y - lastPoint.y) > 2) {
        trail.push(point);
        if (trail.length > 12) trail.shift();
        lastPoint = point;
        schedule();
      }

      const target = event.target instanceof Element ? event.target : null;
      const card = target?.closest<HTMLElement>('#root main .rounded-2xl, #root main .rounded-3xl, #root main .rounded-xl');
      if (card) {
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--shh-spot-x', (event.clientX - rect.left) + 'px');
        card.style.setProperty('--shh-spot-y', (event.clientY - rect.top) + 'px');
        card.classList.add('shh-cursor-card');
      }

      const button = target?.closest<HTMLElement>('#root button:not(:disabled), #root a[class*="cursor-pointer"]');
      if (button && !button.closest('[data-no-magnetic]')) {
        const rect = button.getBoundingClientRect();
        const dx = (event.clientX - (rect.left + rect.width / 2)) / Math.max(rect.width / 2, 1);
        const dy = (event.clientY - (rect.top + rect.height / 2)) / Math.max(rect.height / 2, 1);
        button.style.setProperty('--shh-magnetic-x', (dx * 2.2).toFixed(2) + 'px');
        button.style.setProperty('--shh-magnetic-y', (dy * 2.2).toFixed(2) + 'px');
        button.classList.add('shh-magnetic');
        activeButtons.add(button);
      }
    };

    const onPointerOut = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const next = event.relatedTarget instanceof Element ? event.relatedTarget : null;

      const button = target?.closest<HTMLElement>('.shh-magnetic');
      if (button && (!next || !button.contains(next))) {
        button.style.setProperty('--shh-magnetic-x', '0px');
        button.style.setProperty('--shh-magnetic-y', '0px');
        button.classList.remove('shh-magnetic');
        activeButtons.delete(button);
      }

      const card = target?.closest<HTMLElement>('#root main .shh-cursor-card');
      if (card && (!next || !card.contains(next))) {
        card.classList.remove('shh-cursor-card');
        card.style.removeProperty('--shh-spot-x');
        card.style.removeProperty('--shh-spot-y');
      }
    };

    const onClick = (event: MouseEvent) => {
      ripples.push({ x: event.clientX, y: event.clientY, time: performance.now() });
      if (ripples.length > 5) ripples.shift();
      schedule();
    };

    const onVisibility = () => {
      if (document.hidden && frame) {
        window.cancelAnimationFrame(frame);
        frame = 0;
        trail.length = 0;
        ripples.length = 0;
        ctx.clearRect(0, 0, width, height);
      }
    };

    resize();
    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerout', onPointerOut, { passive: true });
    window.addEventListener('click', onClick, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerout', onPointerOut);
      window.removeEventListener('click', onClick);
      document.removeEventListener('visibilitychange', onVisibility);
      activeButtons.forEach((button) => {
        button.style.removeProperty('--shh-magnetic-x');
        button.style.removeProperty('--shh-magnetic-y');
        button.classList.remove('shh-magnetic');
      });
      canvas.remove();
    };
  }, []);

  return null;
}
