"use client";

import { useEffect } from "react";

const feedEvents = [
  { type: "info", msg: '<span class="teal">KENNEL-04</span> temp nominal <span class="hl">71.6F</span>' },
  { type: "info", msg: '<span class="teal">HOME-AUTO</span> living room lights on' },
  { type: "warn", msg: '<span class="hl">AI CORE</span> query batch processed - 247 req/hr' },
  { type: "info", msg: '<span class="teal">BELLA</span> activity sensor triggered' },
  { type: "info", msg: '<span class="teal">CLIMATE</span> maintaining target <span class="hl">72F</span>' },
  { type: "warn", msg: '<span class="hl">SECURITY</span> motion: driveway sensor cleared' },
  { type: "info", msg: '<span class="teal">KENNEL-02</span> feeding reminder scheduled' },
  { type: "info", msg: '<span class="teal">PEANUT</span> weight log updated' },
  { type: "info", msg: '<span class="teal">HOME-AUTO</span> thermostat adjusted <span class="hl">+0.5F</span>' },
];

const systemMessages = [
  "SYSTEM NOMINAL - ALL KENNEL UNITS SECURE - AI CORE OPERATIONAL",
  "HOME AUTOMATION: 18 NODES ACTIVE - CLIMATE CONTROL ENGAGED",
  "SECURITY PERIMETER: NO ANOMALIES DETECTED - CAMERAS ONLINE",
  "CHEROLEE AI: READY FOR QUERIES - KNOWLEDGE BASE CURRENT",
  "KENNEL MONITORING: TEMP OK - HUMIDITY OK - FEEDING OK",
];

export default function CoreLoginEffects() {
  useEffect(() => {
    const cursor = document.getElementById("cursor");
    const cursorDot = document.getElementById("cursor-dot");
    let mx = 0;
    let my = 0;
    let cx = 0;
    let cy = 0;
    let cursorFrame = 0;

    const handleMove = (event: MouseEvent) => {
      mx = event.clientX;
      my = event.clientY;
    };

    document.addEventListener("mousemove", handleMove);

    const animateCursor = () => {
      if (cursor && cursorDot) {
        cx += (mx - cx) * 0.18;
        cy += (my - cy) * 0.18;
        cursor.style.left = `${cx}px`;
        cursor.style.top = `${cy}px`;
        cursorDot.style.left = `${mx}px`;
        cursorDot.style.top = `${my}px`;
      }
      cursorFrame = requestAnimationFrame(animateCursor);
    };
    animateCursor();

    const interactiveElements = Array.from(document.querySelectorAll("button, a, input, .core-login-biometric, .core-login-module"));
    const growCursor = () => {
      if (!cursor) return;
      cursor.style.width = "32px";
      cursor.style.height = "32px";
      cursor.style.borderColor = "var(--login-gold-bright)";
    };
    const shrinkCursor = () => {
      if (!cursor) return;
      cursor.style.width = "20px";
      cursor.style.height = "20px";
      cursor.style.borderColor = "var(--login-gold)";
    };
    interactiveElements.forEach((element) => {
      element.addEventListener("mouseenter", growCursor);
      element.addEventListener("mouseleave", shrinkCursor);
    });

    const liveTime = document.getElementById("live-time");
    const updateTime = () => {
      if (!liveTime) return;
      liveTime.textContent = new Date().toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    };
    updateTime();
    const timeTimer = window.setInterval(updateTime, 1000);

    const bgCanvas = document.getElementById("bg-canvas") as HTMLCanvasElement | null;
    const bgContext = bgCanvas?.getContext("2d") ?? null;
    let bgFrame = 0;
    let nodes: Array<{ x: number; y: number; vx: number; vy: number; r: number }> = [];

    const resizeBackground = () => {
      if (!bgCanvas) return;
      bgCanvas.width = window.innerWidth;
      bgCanvas.height = window.innerHeight;
      const count = Math.floor((bgCanvas.width * bgCanvas.height) / 14000);
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * bgCanvas.width,
        y: Math.random() * bgCanvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.5 + 0.5,
      }));
    };

    const drawBackground = () => {
      if (!bgCanvas || !bgContext) return;
      const width = bgCanvas.width;
      const height = bgCanvas.height;
      bgContext.clearRect(0, 0, width, height);
      bgContext.fillStyle = "#080b12";
      bgContext.fillRect(0, 0, width, height);

      const glow = bgContext.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width * 0.5);
      glow.addColorStop(0, "rgba(201,168,76,0.04)");
      glow.addColorStop(1, "rgba(0,0,0,0)");
      bgContext.fillStyle = glow;
      bgContext.fillRect(0, 0, width, height);

      for (let i = 0; i < nodes.length; i += 1) {
        for (let j = i + 1; j < nodes.length; j += 1) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < 120) {
            bgContext.strokeStyle = `rgba(201,168,76,${(1 - distance / 120) * 0.12})`;
            bgContext.lineWidth = 0.5;
            bgContext.beginPath();
            bgContext.moveTo(nodes[i].x, nodes[i].y);
            bgContext.lineTo(nodes[j].x, nodes[j].y);
            bgContext.stroke();
          }
        }
      }

      nodes.forEach((node) => {
        bgContext.beginPath();
        bgContext.arc(node.x, node.y, node.r, 0, Math.PI * 2);
        bgContext.fillStyle = "rgba(201,168,76,0.35)";
        bgContext.fill();
        node.x += node.vx;
        node.y += node.vy;
        if (node.x < 0 || node.x > width) node.vx *= -1;
        if (node.y < 0 || node.y > height) node.vy *= -1;
      });

      bgFrame = requestAnimationFrame(drawBackground);
    };

    resizeBackground();
    drawBackground();
    window.addEventListener("resize", resizeBackground);

    const radarCanvas = document.getElementById("radar-canvas") as HTMLCanvasElement | null;
    const radarContext = radarCanvas?.getContext("2d") ?? null;
    let radarFrame = 0;
    let radarAngle = 0;

    const drawRadar = () => {
      if (!radarCanvas || !radarContext) return;
      const width = radarCanvas.width;
      const height = radarCanvas.height;
      const centerX = width / 2;
      const maxRadius = Math.min(width, height * 2) / 2 - 4;

      radarContext.clearRect(0, 0, width, height);

      for (let i = 1; i <= 3; i += 1) {
        radarContext.beginPath();
        radarContext.arc(centerX, height, (maxRadius * i) / 3, Math.PI, 0);
        radarContext.strokeStyle = "rgba(201,168,76,0.12)";
        radarContext.lineWidth = 0.5;
        radarContext.stroke();
      }

      [1, 2].forEach((value) => {
        radarContext.beginPath();
        radarContext.moveTo(centerX, height);
        const angle = Math.PI + (value * Math.PI) / 3;
        radarContext.lineTo(centerX + Math.cos(angle) * maxRadius, height + Math.sin(angle) * maxRadius);
        radarContext.strokeStyle = "rgba(201,168,76,0.08)";
        radarContext.lineWidth = 0.5;
        radarContext.stroke();
      });

      radarContext.save();
      radarContext.translate(centerX, height);
      radarContext.rotate(radarAngle);
      const sweep = radarContext.createLinearGradient(0, -maxRadius, maxRadius, 0);
      sweep.addColorStop(0, "rgba(0,212,170,0)");
      sweep.addColorStop(0.7, "rgba(0,212,170,0.08)");
      sweep.addColorStop(1, "rgba(0,212,170,0.25)");
      radarContext.beginPath();
      radarContext.moveTo(0, 0);
      radarContext.arc(0, 0, maxRadius, -Math.PI / 2, -Math.PI / 2 + Math.PI / 1.5);
      radarContext.fillStyle = sweep;
      radarContext.fill();
      radarContext.restore();

      radarContext.save();
      radarContext.translate(centerX, height);
      radarContext.beginPath();
      radarContext.moveTo(0, 0);
      radarContext.lineTo(Math.cos(radarAngle - Math.PI / 2) * maxRadius, Math.sin(radarAngle - Math.PI / 2) * maxRadius);
      radarContext.strokeStyle = "rgba(0,212,170,0.6)";
      radarContext.lineWidth = 1;
      radarContext.stroke();
      radarContext.restore();

      const blips = [
        { a: 0.4, r: 0.6 },
        { a: 1.8, r: 0.4 },
        { a: 2.5, r: 0.8 },
        { a: 0.9, r: 0.35 },
        { a: 3.0, r: 0.55 },
        { a: 1.2, r: 0.7 },
      ];
      blips.forEach((blip) => {
        const distance = blip.r * maxRadius;
        const x = centerX + Math.cos(blip.a - Math.PI / 2) * distance;
        const y = height + Math.sin(blip.a - Math.PI / 2) * distance;
        let diff = (radarAngle - blip.a) % (Math.PI * 2);
        if (diff < 0) diff += Math.PI * 2;
        const fade = diff < 1 ? Math.max(0, 1 - diff) : 0;
        if (fade > 0) {
          radarContext.beginPath();
          radarContext.arc(x, y, 2, 0, Math.PI * 2);
          radarContext.fillStyle = `rgba(0,212,170,${fade * 0.9})`;
          radarContext.fill();
        }
      });

      radarAngle += 0.015;
      if (radarAngle > Math.PI * 2) radarAngle -= Math.PI * 2;
      radarFrame = requestAnimationFrame(drawRadar);
    };
    drawRadar();

    const feedInner = document.getElementById("feed-inner");
    let feedIndex = 0;
    const addFeedItem = () => {
      if (!feedInner) return;
      const event = feedEvents[feedIndex % feedEvents.length];
      feedIndex += 1;
      const timestamp = new Date().toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      const entry = document.createElement("div");
      entry.className = `feed-item ${event.type}`;
      entry.innerHTML = `<span class="feed-ts">${timestamp}</span><span class="feed-msg">${event.msg}</span>`;
      feedInner.insertBefore(entry, feedInner.firstChild);
      while (feedInner.children.length > 9) {
        feedInner.removeChild(feedInner.lastChild as Node);
      }
    };
    for (let i = 0; i < 6; i += 1) addFeedItem();
    const feedTimer = window.setInterval(addFeedItem, 3200);

    const sparkline = document.getElementById("sparkline");
    if (sparkline && sparkline.children.length === 0) {
      const sparkData = [70.2, 70.8, 71.0, 71.5, 72.0, 71.8, 71.4, 71.9, 72.2, 71.7, 71.5, 72.1, 72.3, 71.6, 71.8, 72.0, 71.4, 71.9, 72.1, 71.8];
      const min = Math.min(...sparkData);
      const max = Math.max(...sparkData);
      sparkData.forEach((value, index) => {
        const bar = document.createElement("div");
        const height = Math.round(((value - min) / (max - min + 0.001)) * 18 + 4);
        bar.className = `spark-bar${index === sparkData.length - 1 ? " active" : ""}`;
        bar.style.height = `${height}px`;
        sparkline.appendChild(bar);
      });
    }

    const sysMsg = document.getElementById("sys-msg");
    let messageIndex = 0;
    const messageTimer = window.setInterval(() => {
      if (!sysMsg) return;
      messageIndex = (messageIndex + 1) % systemMessages.length;
      sysMsg.style.opacity = "0";
      window.setTimeout(() => {
        sysMsg.textContent = systemMessages[messageIndex];
        sysMsg.style.opacity = "1";
      }, 300);
    }, 4000);

    const latency = document.getElementById("latency");
    const latencyTimer = window.setInterval(() => {
      if (latency) latency.textContent = `${Math.floor(Math.random() * 6) + 2}ms`;
    }, 2000);

    const form = document.querySelector(".core-login-card");
    const handleSubmit = () => {
      const spinner = document.getElementById("btn-spinner") as HTMLElement | null;
      const btnText = document.getElementById("btn-text");
      if (spinner) spinner.style.display = "inline-block";
      if (btnText) btnText.textContent = "AUTHENTICATING...";
    };
    form?.addEventListener("submit", handleSubmit);

    return () => {
      document.removeEventListener("mousemove", handleMove);
      cancelAnimationFrame(cursorFrame);
      cancelAnimationFrame(bgFrame);
      cancelAnimationFrame(radarFrame);
      window.removeEventListener("resize", resizeBackground);
      window.clearInterval(timeTimer);
      window.clearInterval(feedTimer);
      window.clearInterval(messageTimer);
      window.clearInterval(latencyTimer);
      interactiveElements.forEach((element) => {
        element.removeEventListener("mouseenter", growCursor);
        element.removeEventListener("mouseleave", shrinkCursor);
      });
      form?.removeEventListener("submit", handleSubmit);
    };
  }, []);

  return null;
}
