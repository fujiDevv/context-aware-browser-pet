export interface SpringOptions {
  stiffness?: number;
  damping?: number;
  mass?: number;
  precision?: number;
}

export interface SpringAnimation {
  then(onResolve: () => void): void;
  stop(): void;
}

export function springAnimate(
  el: HTMLElement,
  properties: Record<string, string>,
  options: SpringOptions = {}
): SpringAnimation {
  const {
    stiffness = 200,
    damping = 20,
    mass = 1,
    precision = 0.5
  } = options;

  const props = Object.keys(properties);

  interface PropState {
    current: number;
    target: number;
    velocity: number;
    unit: string;
    prop: string;
  }

  const states: PropState[] = props.map((prop) => {
    const targetStr = properties[prop];
    const match = targetStr.match(/^(-?[\d.]+)(.*)$/);
    const target = match ? parseFloat(match[1]) : 0;
    const unit = match ? match[2] : '';

    const computedStr = el.style.getPropertyValue(prop) || getComputedStyle(el).getPropertyValue(prop);
    const computedMatch = computedStr.match(/^(-?[\d.]+)/);
    const current = computedMatch ? parseFloat(computedMatch[1]) : 0;

    return { current, target, velocity: 0, unit, prop };
  });

  let raf: number | null = null;
  let settled = false;
  let cancelled = false;
  const callbacks: Array<() => void> = [];

  let prevTime = performance.now();

  const tick = (now: number) => {
    if (cancelled) return;

    const dt = Math.min((now - prevTime) / 1000, 0.064);
    prevTime = now;

    let allSettled = true;

    for (const s of states) {
      const displacement = s.current - s.target;
      const springForce = -stiffness * displacement;
      const dampingForce = -damping * s.velocity;
      const acceleration = (springForce + dampingForce) / mass;

      s.velocity += acceleration * dt;
      s.current += s.velocity * dt;

      if (Math.abs(s.current - s.target) < precision && Math.abs(s.velocity) < precision) {
        s.current = s.target;
        s.velocity = 0;
      } else {
        allSettled = false;
      }

      el.style.setProperty(s.prop, `${s.current}${s.unit}`);
    }

    if (allSettled) {
      settled = true;
      callbacks.forEach((cb) => cb());
    } else {
      raf = requestAnimationFrame(tick);
    }
  };

  raf = requestAnimationFrame(tick);

  return {
    then(onResolve: () => void) {
      if (settled) {
        onResolve();
      } else {
        callbacks.push(onResolve);
      }
    },
    stop() {
      cancelled = true;
      if (raf !== null) {
        cancelAnimationFrame(raf);
        raf = null;
      }
    }
  };
}

export interface KeyframeAnimateOptions {
  duration?: number;
  easing?: string;
  fill?: FillMode;
}

export function keyframeAnimate(
  el: HTMLElement,
  keyframes: Keyframe[],
  options: KeyframeAnimateOptions = {}
): { then(cb: () => void): void; stop(): void } {
  const {
    duration = 0.5,
    easing = 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    fill = 'forwards'
  } = options;

  const animation = el.animate(keyframes, {
    duration: duration * 1000,
    easing,
    fill
  });

  return {
    then(cb: () => void) {
      animation.finished.then(cb).catch((e) => { console.warn('[Arcrawls Animate] animation finish error:', e); });
    },
    stop() {
      animation.cancel();
    }
  };
}

export function springKeyframes(
  from: Record<string, string>,
  to: Record<string, string>,
  overshootPercent = 15
): Keyframe[] {
  const keys = [...new Set([...Object.keys(from), ...Object.keys(to)])];
  const frames: Keyframe[] = [];

  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const parseNum = (v: string) => parseFloat(v) || 0;

  frames.push({ ...from, offset: 0 });

  const overshoot: Keyframe = { offset: 0.4 };
  for (const k of keys) {
    const a = parseNum(from[k] || '0');
    const b = parseNum(to[k] || '0');
    const unit = (to[k] || from[k] || '').replace(/[-\d.]/g, '');
    overshoot[k] = `${lerp(a, b, 1 + overshootPercent / 100)}${unit}`;
  }
  frames.push(overshoot);

  const settleBack: Keyframe = { offset: 0.65 };
  for (const k of keys) {
    const a = parseNum(from[k] || '0');
    const b = parseNum(to[k] || '0');
    const unit = (to[k] || from[k] || '').replace(/[-\d.]/g, '');
    settleBack[k] = `${lerp(a, b, 1 - overshootPercent / 200)}${unit}`;
  }
  frames.push(settleBack);

  const minorOvershoot: Keyframe = { offset: 0.85 };
  for (const k of keys) {
    const a = parseNum(from[k] || '0');
    const b = parseNum(to[k] || '0');
    const unit = (to[k] || from[k] || '').replace(/[-\d.]/g, '');
    minorOvershoot[k] = `${lerp(a, b, 1 + overshootPercent / 400)}${unit}`;
  }
  frames.push(minorOvershoot);

  frames.push({ ...to, offset: 1 });

  return frames;
}
