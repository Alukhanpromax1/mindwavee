// Smooth third-person camera with terrain avoidance, gentle auto-follow,
// framed "focus" shots for interactions, and keyframed cinematic paths.
import * as THREE from 'three';
import { damp, dampAngle, clamp, easeInOut } from '../core/math.js';
import { heightAt, WATER_LEVEL } from '../world/layout.js';
import { blocked } from '../world/colliders.js';

export class CameraRig {
  constructor(camera) {
    this.camera = camera;
    this.yaw = Math.PI; // camera sits behind the player (player faces -z at start)
    this.pitch = 0.3;
    this.distance = 7.5;
    this.targetDistance = 7.5;
    this.sensitivity = 1;
    this.autoFollow = true;
    this.reducedMotion = false;
    this.mode = 'follow'; // follow | focus | cinematic
    this.focus = null;
    this.cine = null;
    this.lookAt = new THREE.Vector3();
    this.curLook = new THREE.Vector3();
    this.curPos = new THREE.Vector3();
    this.initialized = false;
  }

  applyLook(look, dt) {
    const s = 0.0042 * this.sensitivity;
    this.yaw -= look.x * s;
    this.pitch = clamp(this.pitch + look.y * s, -0.15, 1.15);
    if (look.zoom) this.targetDistance = clamp(this.targetDistance + look.zoom * 1.1, 3.5, 16);
    void dt;
  }

  /** Point the camera behind the player instantly. */
  snapBehind(player) {
    this.yaw = player.heading + Math.PI;
    this.initialized = false;
  }

  setFocus(f) {
    // f: { target: Vector3, from: Vector3 }
    this.focus = f;
    this.mode = f ? 'focus' : 'follow';
  }

  playCinematic(points, looks, duration, onDone) {
    this.cine = {
      curve: new THREE.CatmullRomCurve3(points, false, 'centripetal'),
      looks: new THREE.CatmullRomCurve3(looks, false, 'centripetal'),
      t: 0,
      duration,
      onDone,
    };
    this.mode = 'cinematic';
    this.initialized = false;
  }

  stopCinematic() {
    if (this.mode === 'cinematic') {
      const cb = this.cine?.onDone;
      this.cine = null;
      this.mode = 'follow';
      cb?.();
    }
  }

  update(dt, player, moving, lookActive) {
    const cam = this.camera;
    if (this.mode === 'cinematic' && this.cine) {
      const c = this.cine;
      c.t += dt / c.duration;
      const t = easeInOut(clamp(c.t));
      const p = c.curve.getPoint(t);
      const l = c.looks.getPoint(t);
      const gh = Math.max(heightAt(p.x, p.z), WATER_LEVEL) + 2;
      if (p.y < gh) p.y = gh;
      if (!this.initialized || this.reducedMotion) {
        this.curPos.copy(p);
        this.curLook.copy(l);
        this.initialized = true;
      } else {
        this.curPos.lerp(p, 1 - Math.exp(-6 * dt));
        this.curLook.lerp(l, 1 - Math.exp(-6 * dt));
      }
      cam.position.copy(this.curPos);
      cam.lookAt(this.curLook);
      if (c.t >= 1) this.stopCinematic();
      return;
    }

    let desiredPos;
    let desiredLook;
    if (this.mode === 'focus' && this.focus) {
      desiredPos = this.focus.from.clone();
      desiredLook = this.focus.target.clone();
    } else {
      if (this.autoFollow && moving && !lookActive) {
        this.yaw = dampAngle(this.yaw, player.heading + Math.PI, 1.6, dt);
      }
      this.distance = damp(this.distance, this.targetDistance, 6, dt);
      const tgt = player.pos.clone();
      tgt.y += 1.2;
      const cp = Math.cos(this.pitch);
      desiredPos = new THREE.Vector3(
        tgt.x + Math.sin(this.yaw) * cp * this.distance,
        tgt.y + Math.sin(this.pitch) * this.distance,
        tgt.z + Math.cos(this.yaw) * cp * this.distance
      );
      desiredLook = tgt;
    }
    // keep above ground / water
    const g = Math.max(heightAt(desiredPos.x, desiredPos.z), WATER_LEVEL) + 0.9;
    if (desiredPos.y < g) desiredPos.y = g;
    // don't let the camera sit inside standing stones or trunks
    if (this.mode === 'follow') {
      const steps = 12;
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const x = desiredLook.x + (desiredPos.x - desiredLook.x) * t;
        const y = desiredLook.y + (desiredPos.y - desiredLook.y) * t;
        const z = desiredLook.z + (desiredPos.z - desiredLook.z) * t;
        if (blocked(x, y, z, 0.5)) {
          const k = Math.max(0.25, (i - 1) / steps);
          desiredPos.set(desiredLook.x + (desiredPos.x - desiredLook.x) * k, desiredLook.y + (desiredPos.y - desiredLook.y) * k + 0.6, desiredLook.z + (desiredPos.z - desiredLook.z) * k);
          break;
        }
      }
    }

    if (!this.initialized) {
      this.curPos.copy(desiredPos);
      this.curLook.copy(desiredLook);
      this.initialized = true;
    } else {
      const k = this.mode === 'focus' ? (this.reducedMotion ? 20 : 2.2) : 9;
      this.curPos.x = damp(this.curPos.x, desiredPos.x, k, dt);
      this.curPos.y = damp(this.curPos.y, desiredPos.y, k, dt);
      this.curPos.z = damp(this.curPos.z, desiredPos.z, k, dt);
      const kl = this.mode === 'focus' ? (this.reducedMotion ? 20 : 2.5) : 14;
      this.curLook.x = damp(this.curLook.x, desiredLook.x, kl, dt);
      this.curLook.y = damp(this.curLook.y, desiredLook.y, kl, dt);
      this.curLook.z = damp(this.curLook.z, desiredLook.z, kl, dt);
    }
    cam.position.copy(this.curPos);
    cam.lookAt(this.curLook);
  }

  /** Forward/right vectors on the ground plane for camera-relative movement. */
  groundBasis() {
    const f = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const r = new THREE.Vector3(-f.z, 0, f.x);
    return { f, r };
  }
}
