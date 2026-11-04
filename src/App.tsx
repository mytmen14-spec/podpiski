import { useRef, useEffect, useState, useCallback } from 'react';

/* ============================================================
   CONFIG — все настройки, цвета, тайминги, тексты
   ============================================================ */
const CONFIG = {
  W: 1080,
  H: 1920,
  FPS: 30,
  DURATION: 38,
  COLORS: {
    bg: '#F4F6F8',
    success: '#22C55E',
    danger: '#EF4444',
    text: '#0F172A',
    caption: '#333C46',
    white: '#FFFFFF',
    gold: '#F59E0B',
    purple: '#8B5CF6',
    blue: '#3B82F6',
    yellow: '#EAB308',
    gray: '#94A3B8',
    lightGray: '#E2E8F0',
    darkBg: '#1E293B',
  },
  SCENES: [
    { id: 1, start: 0.0, end: 3.5 },
    { id: 2, start: 3.5, end: 9.0 },
    { id: 3, start: 9.0, end: 16.0 },
    { id: 4, start: 16.0, end: 24.0 },
    { id: 5, start: 24.0, end: 31.0 },
    { id: 6, start: 31.0, end: 38.0 },
  ],
  CAPTIONS: [
    { text: 'За 30 секунд научишься находить и отменять скрытые подписки, которые воруют твои деньги', start: 0.0, end: 3.5 },
    { text: 'Подписки воруют деньги каждый месяц', start: 3.5, end: 9.0 },
    { text: 'Настройки → аккаунт → подписки', start: 9.0, end: 16.0 },
    { text: 'Отмени ненужное — верни свои деньги', start: 16.0, end: 24.0 },
    { text: 'ИИ найдёт регулярные списания за секунды', start: 24.0, end: 31.0 },
    { text: 'Сохраняй видео и проверяй свои подписки сегодня', start: 31.0, end: 38.0 },
  ],
};

/* ============================================================
   TIMELINE — предвычисленные «случайные» значения (SEED)
   ============================================================ */
const SEED: number[] = [];
{
  // Детерминированный генератор
  let s = 42;
  const rng = () => { s = (s * 1664525 + 1013904223) & 0xFFFFFFFF; return (s >>> 0) / 0xFFFFFFFF; };
  for (let i = 0; i < 200; i++) SEED.push(rng());
}

/* ============================================================
   DRAW HELPERS — утилиты рисования
   ============================================================ */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3);
}

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  t = Math.max(0, Math.min(1, t));
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function easeInOutQuad(t: number): number {
  t = Math.max(0, Math.min(1, t));
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawCoin(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, alpha: number = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  // Монетка
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.fillStyle = CONFIG.COLORS.gold;
  ctx.fill();
  ctx.strokeStyle = '#D97706';
  ctx.lineWidth = size * 0.15;
  ctx.stroke();
  // ₽
  ctx.fillStyle = '#92400E';
  ctx.font = `bold ${size * 1.1}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('₽', x, y + 1);
  ctx.restore();
}

function drawCross(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, progress: number) {
  ctx.save();
  ctx.strokeStyle = CONFIG.COLORS.danger;
  ctx.lineWidth = size * 0.15;
  ctx.lineCap = 'round';
  const s = size * 0.4;
  // Первая линия
  const p1 = Math.min(1, progress * 2);
  if (p1 > 0) {
    ctx.beginPath();
    ctx.moveTo(x - s, y - s);
    ctx.lineTo(x - s + 2 * s * p1, y - s + 2 * s * p1);
    ctx.stroke();
  }
  // Вторая линия
  const p2 = Math.max(0, Math.min(1, (progress - 0.5) * 2));
  if (p2 > 0) {
    ctx.beginPath();
    ctx.moveTo(x + s, y - s);
    ctx.lineTo(x + s - 2 * s * p2, y - s + 2 * s * p2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPhone(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.save();
  // Корпус
  roundRect(ctx, x, y, w, h, 40);
  ctx.fillStyle = '#1E293B';
  ctx.fill();
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 4;
  ctx.stroke();
  // Экран
  roundRect(ctx, x + 12, y + 60, w - 24, h - 120, 20);
  ctx.fillStyle = CONFIG.COLORS.white;
  ctx.fill();
  // Notch
  roundRect(ctx, x + w / 2 - 60, y + 10, 120, 30, 15);
  ctx.fillStyle = '#0F172A';
  ctx.fill();
  ctx.restore();
}

function drawCaption(ctx: CanvasRenderingContext2D, text: string, t: number, sceneStart: number, sceneEnd: number) {
  const sceneDuration = sceneEnd - sceneStart;
  const localT = t - sceneStart;
  const progress = localT / sceneDuration;

  // Разбиваем текст на слова
  const words = text.split(' ');
  const wordCount = words.length;
  const wordsToShow = Math.floor(progress * (wordCount + 2)); // +2 чтобы последние слова успели показаться

  // Плашка
  const padding = 30;
  const fontSize = 42;
  ctx.font = `bold ${fontSize}px system-ui, sans-serif`;

  // Измеряем ширину текста
  let maxLineWidth = 0;
  const lineWords: string[][] = [];
  let currentLine: string[] = [];
  const maxWidth = CONFIG.W - 120;

  for (const word of words.slice(0, Math.min(wordsToShow, wordCount))) {
    const testLine = [...currentLine, word].join(' ');
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine.length > 0) {
      lineWords.push([...currentLine]);
      currentLine = [word];
    } else {
      currentLine.push(word);
    }
  }
  if (currentLine.length > 0) lineWords.push(currentLine);

  const lineHeight = fontSize * 1.4;
  const totalHeight = lineWords.length * lineHeight;
  const boxY = CONFIG.H - 200;
  const boxH = totalHeight + padding * 2;

  // Фон плашки
  roundRect(ctx, 40, boxY, CONFIG.W - 80, boxH, 20);
  ctx.fillStyle = CONFIG.COLORS.caption;
  ctx.globalAlpha = 0.92;
  ctx.fill();
  ctx.globalAlpha = 1;

  // Рисуем слова
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let currentWordIndex = 0;
  for (let li = 0; li < lineWords.length; li++) {
    const line = lineWords[li];
    // Собираем строку с подсветкой текущего слова
    let x = CONFIG.W / 2;
    const y = boxY + padding + li * lineHeight + lineHeight / 2;

    // Рисуем каждое слово
    let totalWidth = 0;
    const wordWidths: number[] = [];
    for (const w of line) {
      const ww = ctx.measureText(w + ' ').width;
      wordWidths.push(ww);
      totalWidth += ww;
    }
    totalWidth -= ctx.measureText(' ').width; // убираем последний пробел

    let drawX = x - totalWidth / 2;
    for (let wi = 0; wi < line.length; wi++) {
      const isCurrent = currentWordIndex === wordsToShow - 1;
      ctx.fillStyle = isCurrent ? CONFIG.COLORS.success : CONFIG.COLORS.white;
      ctx.fillText(line[wi], drawX + wordWidths[wi] / 2 - ctx.measureText(' ').width / 2, y);
      drawX += wordWidths[wi];
      currentWordIndex++;
    }
  }
}

function drawPill(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, bgColor: string, textColor: string, fontSize: number = 32) {
  ctx.save();
  ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
  const metrics = ctx.measureText(text);
  const pw = metrics.width + 40;
  const ph = fontSize + 20;
  roundRect(ctx, x - pw / 2, y - ph / 2, pw, ph, ph / 2);
  ctx.fillStyle = bgColor;
  ctx.fill();
  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y + 1);
  ctx.restore();
}

/* ============================================================
   SCENES — функции рендеринга сцен
   ============================================================ */

// Прогресс-бар и счётчик сверху
function drawProgressBar(ctx: CanvasRenderingContext2D, t: number) {
  const progress = t / CONFIG.DURATION;
  // Зелёная полоска
  ctx.fillStyle = CONFIG.COLORS.success;
  ctx.fillRect(0, 0, CONFIG.W * progress, 6);
  // Пилюля-счётчик
  const sec = Math.min(Math.floor(t) + 1, CONFIG.DURATION);
  const text = `${sec}/${CONFIG.DURATION}`;
  drawPill(ctx, CONFIG.W - 80, 40, text, CONFIG.COLORS.darkBg, CONFIG.COLORS.white, 28);
}

// Сцена 1: ХУК
function renderScene1(ctx: CanvasRenderingContext2D, t: number) {
  const localT = t - 0;
  const cx = CONFIG.W / 2;
  const lines = ['ЗА 30 СЕКУНД —', 'НАУЧИШЬСЯ НАХОДИТЬ', 'СКРЫТЫЕ ПОДПИСКИ'];
  const lineColors = [CONFIG.COLORS.text, CONFIG.COLORS.text, CONFIG.COLORS.danger];

  for (let i = 0; i < lines.length; i++) {
    const delay = i * 0.4;
    const progress = Math.max(0, (localT - delay) / 0.6);
    const scale = easeOutBack(Math.min(1, progress));
    const alpha = Math.min(1, progress * 2);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(cx, 700 + i * 140);
    ctx.scale(scale, scale);
    ctx.font = `bold ${i === 2 ? 72 : 64}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = lineColors[i];
    ctx.fillText(lines[i], 0, 0);
    ctx.restore();
  }

  // Монетки на фоне
  for (let i = 0; i < 8; i++) {
    const seed = SEED[i];
    const x = seed * CONFIG.W;
    const baseY = SEED[i + 10] * CONFIG.H;
    const y = baseY - localT * 40 * (0.5 + SEED[i + 20] * 0.5);
    const wrappedY = ((y % CONFIG.H) + CONFIG.H) % CONFIG.H;
    const size = 20 + SEED[i + 30] * 20;
    drawCoin(ctx, x, wrappedY, size, 0.3 + SEED[i + 40] * 0.3);
  }
}

// Сцена 2: КРЕСТЫ НА СЕРВИСАХ
function renderScene2(ctx: CanvasRenderingContext2D, t: number) {
  const localT = t - 3.5;
  const services = [
    { label: 'N', color: '#DC2626', bg: '#FEE2E2', shape: 'rect' },
    { label: 'Я', color: '#DC2626', bg: '#FEF3C7', shape: 'circle' },
    { label: 'M', color: '#7C3AED', bg: '#EDE9FE', shape: 'circle' },
    { label: 'S', color: '#2563EB', bg: '#DBEAFE', shape: 'circle' },
  ];

  const gridX = 140;
  const gridY = 500;
  const cardW = 360;
  const cardH = 360;
  const gap = 60;

  for (let i = 0; i < 4; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cx = gridX + col * (cardW + gap) + cardW / 2;
    const cy = gridY + row * (cardH + gap) + cardH / 2;
    const svc = services[i];

    // Время появления креста
    const crossTime = 0.8 + i * 1.2;
    const isCrossed = localT > crossTime;
    const crossProgress = isCrossed ? Math.min(1, (localT - crossTime) / 0.4) : 0;
    const isGray = isCrossed && crossProgress > 0.5;

    ctx.save();

    // Тряска при появлении креста
    if (isCrossed && crossProgress < 0.5) {
      const shake = Math.sin(crossProgress * 30) * 5 * (1 - crossProgress * 2);
      ctx.translate(shake, shake * 0.5);
    }

    // Карточка
    roundRect(ctx, cx - cardW / 2, cy - cardH / 2, cardW, cardH, 30);
    ctx.fillStyle = isGray ? '#D1D5DB' : svc.bg;
    ctx.fill();
    ctx.strokeStyle = isGray ? '#9CA3AF' : svc.color;
    ctx.lineWidth = 4;
    ctx.stroke();

    // Иконка
    ctx.font = `bold 120px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isGray ? '#6B7280' : svc.color;
    ctx.fillText(svc.label, cx, cy);

    // Крест
    if (isCrossed) {
      const crossScale = 1 + 0.6 * (1 - easeOutCubic(crossProgress));
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(crossScale, crossScale);
      drawCross(ctx, 0, 0, cardW * 0.6, crossProgress);
      ctx.restore();
    }

    ctx.restore();

    // Монеты вылетают после креста
    if (isCrossed && crossProgress > 0.3) {
      const coinT = (crossProgress - 0.3) / 0.7;
      for (let c = 0; c < 3; c++) {
        const seed = SEED[50 + i * 3 + c];
        const coinProgress = Math.min(1, coinT * 1.5 - c * 0.15);
        if (coinProgress <= 0) continue;
        const startX = cx + (seed - 0.5) * 60;
        const startY = cy;
        const endX = cx + (SEED[60 + i * 3 + c] - 0.5) * 200;
        const endY = cy - 200 - SEED[70 + i * 3 + c] * 150;
        const px = lerp(startX, endX, easeOutCubic(coinProgress));
        const py = lerp(startY, endY, easeOutCubic(coinProgress)) - Math.sin(coinProgress * Math.PI) * 80;
        const alpha = 1 - coinProgress;
        drawCoin(ctx, px, py, 22, alpha);
      }
    }
  }
}

// Сцена 3: ГАЙД ПО НАСТРОЙКАМ
function renderScene3(ctx: CanvasRenderingContext2D, t: number) {
  const localT = t - 9.0;
  const phoneX = CONFIG.W / 2 - 200;
  const phoneY = 400;
  const phoneW = 400;
  const phoneH = 800;

  drawPhone(ctx, phoneX, phoneY, phoneW, phoneH);

  // Экран телефона
  const screenX = phoneX + 12;
  const screenY = phoneY + 60;
  const screenW = phoneW - 24;
  const screenH = phoneH - 120;

  // Бейдж шага
  let step = 1;
  if (localT > 4.5) step = 3;
  else if (localT > 2) step = 2;

  drawPill(ctx, CONFIG.W / 2, phoneY - 40, `ШАГ ${step}/3`, CONFIG.COLORS.success, CONFIG.COLORS.white, 30);

  // Содержимое экрана
  ctx.save();
  roundRect(ctx, screenX, screenY, screenW, screenH, 20);
  ctx.clip();

  // Слайд экрана
  const slideOffset = step === 1 ? 0 : step === 2 ? -screenW * 0.1 : -screenW * 0.2;

  const items = [
    { icon: '⚙', label: 'Настройки', highlight: step === 1 },
    { icon: '👤', label: 'Apple ID / Google', highlight: step === 2 },
    { icon: '💳', label: 'Подписки', highlight: step === 3 },
  ];

  for (let i = 0; i < items.length; i++) {
    const itemY = screenY + 80 + i * 120 + slideOffset;
    const item = items[i];

    // Строка
    if (item.highlight) {
      roundRect(ctx, screenX + 10, itemY - 30, screenW - 20, 80, 15);
      ctx.fillStyle = '#DCFCE7';
      ctx.fill();
      ctx.strokeStyle = CONFIG.COLORS.success;
      ctx.lineWidth = 3;
      ctx.stroke();

      // Ripple
      const rippleProgress = (localT % 1.5) / 1.5;
      ctx.beginPath();
      ctx.arc(screenX + screenW / 2, itemY + 10, 30 + rippleProgress * 40, 0, Math.PI * 2);
      ctx.strokeStyle = CONFIG.COLORS.success;
      ctx.globalAlpha = 1 - rippleProgress;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Иконка (рисуем примитивами)
    const iconX = screenX + 60;
    const iconY = itemY + 10;
    ctx.beginPath();
    ctx.arc(iconX, iconY, 25, 0, Math.PI * 2);
    ctx.fillStyle = item.highlight ? CONFIG.COLORS.success : CONFIG.COLORS.lightGray;
    ctx.fill();

    // Буква иконки
    ctx.font = `bold 24px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = item.highlight ? CONFIG.COLORS.white : CONFIG.COLORS.gray;
    const iconLetters = ['H', 'A', 'P'];
    ctx.fillText(iconLetters[i], iconX, iconY);

    // Текст
    ctx.font = `${item.highlight ? 'bold' : 'normal'} 30px system-ui, sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillStyle = item.highlight ? CONFIG.COLORS.text : CONFIG.COLORS.gray;
    ctx.fillText(item.label, iconX + 45, iconY + 2);
  }

  // Подписки (шаг 3)
  if (step === 3) {
    const subs = ['Музыка −299 ₽/мес', 'Облако −199 ₽/мес', 'Видео −450 ₽/мес'];
    for (let i = 0; i < subs.length; i++) {
      const subY = screenY + 500 + i * 80;
      roundRect(ctx, screenX + 20, subY, screenW - 40, 60, 10);
      ctx.fillStyle = CONFIG.COLORS.lightGray;
      ctx.fill();
      ctx.font = '24px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillStyle = CONFIG.COLORS.text;
      ctx.fillText(subs[i], screenX + 40, subY + 35);
    }
  }

  ctx.restore();
}

// Сцена 4: ОТМЕНА И ЭКОНОМИЯ
function renderScene4(ctx: CanvasRenderingContext2D, t: number) {
  const localT = t - 16.0;
  const subs = [
    { name: 'Музыка', price: '−299 ₽/мес', cancelTime: 0.5 },
    { name: 'Облако', price: '−199 ₽/мес', cancelTime: 2.5 },
    { name: 'Видео', price: '−450 ₽/мес', cancelTime: 4.5 },
  ];

  const startY = 500;
  const rowH = 140;

  // Счётчик экономии
  const totalSavings = 948;
  const savingsProgress = easeOutCubic(Math.min(1, localT / 6));
  const currentSavings = Math.floor(totalSavings * savingsProgress);

  // Фон счётчика
  drawPill(ctx, CONFIG.W / 2, 350, `Экономия: ${currentSavings} ₽/мес`, CONFIG.COLORS.success, CONFIG.COLORS.white, 40);

  for (let i = 0; i < subs.length; i++) {
    const sub = subs[i];
    const y = startY + i * rowH;
    const isCancelled = localT > sub.cancelTime + 1;
    const cancelProgress = isCancelled ? Math.min(1, (localT - sub.cancelTime - 1) / 0.5) : 0;
    const showButton = localT > sub.cancelTime && !isCancelled;
    const buttonProgress = showButton ? Math.min(1, (localT - sub.cancelTime) / 0.3) : 0;

    // Схлопывание
    const height = isCancelled ? lerp(rowH - 30, 0, easeOutCubic(cancelProgress)) : rowH - 30;
    if (height <= 2) continue;

    ctx.save();
    ctx.globalAlpha = isCancelled ? 1 - cancelProgress : 1;

    // Строка
    roundRect(ctx, 100, y, CONFIG.W - 200, height, 15);
    ctx.fillStyle = isCancelled ? '#DCFCE7' : CONFIG.COLORS.lightGray;
    ctx.fill();

    if (isCancelled) {
      ctx.font = 'bold 32px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = CONFIG.COLORS.success;
      ctx.fillText('Отменена ✓', CONFIG.W / 2, y + height / 2 + 2);
    } else {
      // Название и цена
      ctx.font = '30px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillStyle = CONFIG.COLORS.text;
      ctx.fillText(sub.name, 140, y + 35);
      ctx.fillStyle = CONFIG.COLORS.danger;
      ctx.fillText(sub.price, 140, y + 75);

      // Кнопка отмены
      if (showButton) {
        const btnScale = easeOutBack(buttonProgress);
        ctx.save();
        ctx.translate(CONFIG.W - 220, y + height / 2);
        ctx.scale(btnScale, btnScale);
        roundRect(ctx, -80, -25, 160, 50, 25);
        ctx.fillStyle = CONFIG.COLORS.danger;
        ctx.fill();
        ctx.font = 'bold 24px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = CONFIG.COLORS.white;
        ctx.fillText('Отменить', 0, 1);
        ctx.restore();
      }
    }
    ctx.restore();
  }

  // Монеты возвращаются в кошелёк
  if (localT > 5) {
    const walletX = CONFIG.W / 2;
    const walletY = 250;
    // Кошелёк
    roundRect(ctx, walletX - 40, walletY - 30, 80, 60, 10);
    ctx.fillStyle = CONFIG.COLORS.gold;
    ctx.fill();
    ctx.font = 'bold 36px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#92400E';
    ctx.fillText('₽', walletX, walletY);

    // Летящие монеты
    for (let i = 0; i < 5; i++) {
      const coinT = ((localT - 5 + i * 0.4) % 2) / 2;
      const seed = SEED[100 + i];
      const startX = 200 + seed * 600;
      const startY = 800 + SEED[110 + i] * 300;
      const px = lerp(startX, walletX, easeInOutQuad(coinT));
      const py = lerp(startY, walletY, easeInOutQuad(coinT));
      const alpha = coinT < 0.8 ? 1 : (1 - coinT) * 5;
      drawCoin(ctx, px, py, 18, alpha);
    }
  }
}

// Сцена 5: ИИ-АНАЛИЗ ВЫПИСКИ
function renderScene5(ctx: CanvasRenderingContext2D, t: number) {
  const localT = t - 24.0;
  const cardX = 80;
  const cardY = 400;
  const cardW = CONFIG.W - 160;
  const cardH = 1000;

  // Белая карточка с тенью
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.1)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 5;
  roundRect(ctx, cardX, cardY, cardW, cardH, 30);
  ctx.fillStyle = CONFIG.COLORS.white;
  ctx.fill();
  ctx.restore();

  // Строки выписки
  const rows = [
    { name: 'Кафе "У дома"', amount: '−450 ₽', regular: false },
    { name: 'Сервис музыки', amount: '−299 ₽', regular: true },
    { name: 'Такси', amount: '−320 ₽', regular: false },
    { name: 'Облачное хранилище', amount: '−199 ₽', regular: true },
    { name: 'Продукты', amount: '−1 200 ₽', regular: false },
    { name: 'Видеосервис', amount: '−450 ₽', regular: true },
    { name: 'Ресторан', amount: '−890 ₽', regular: false },
    { name: 'Фитнес-приложение', amount: '−399 ₽', regular: true },
  ];

  // Scan-линия
  const scanProgress = Math.min(1, localT / 4);
  const scanY = cardY + 60 + scanProgress * (cardH - 120);

  ctx.save();
  roundRect(ctx, cardX, cardY, cardW, cardH, 30);
  ctx.clip();

  for (let i = 0; i < rows.length; i++) {
    const rowY = cardY + 80 + i * 110;
    const row = rows[i];
    const isScanned = scanY > rowY + 50;

    // Blur-rect для "замыленных" названий (до скана)
    if (!isScanned) {
      roundRect(ctx, cardX + 30, rowY, cardW * 0.5, 35, 5);
      ctx.fillStyle = CONFIG.COLORS.lightGray;
      ctx.fill();
      // Сумма
      ctx.font = '28px system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillStyle = CONFIG.COLORS.gray;
      ctx.fillText(row.amount, cardX + cardW - 30, rowY + 25);
    } else {
      // Название
      ctx.font = '28px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillStyle = CONFIG.COLORS.text;
      ctx.fillText(row.name, cardX + 30, rowY + 25);
      // Сумма
      ctx.textAlign = 'right';
      ctx.fillStyle = CONFIG.COLORS.danger;
      ctx.fillText(row.amount, cardX + cardW - 30, rowY + 25);

      // Подсветка регулярных
      if (row.regular && localT > 4.5) {
        const highlightProgress = Math.min(1, (localT - 4.5 - i * 0.2) / 0.5);
        if (highlightProgress > 0) {
          roundRect(ctx, cardX + 15, rowY - 15, cardW - 30, 70, 10);
          ctx.strokeStyle = CONFIG.COLORS.danger;
          ctx.lineWidth = 3;
          ctx.globalAlpha = highlightProgress;
          ctx.stroke();
          ctx.globalAlpha = 1;

          // Пилюля "РЕГУЛЯРНОЕ СПИСАНИЕ"
          if (highlightProgress > 0.5) {
            drawPill(ctx, cardX + cardW - 180, rowY + 55, 'РЕГУЛЯРНОЕ', CONFIG.COLORS.danger, CONFIG.COLORS.white, 20);
          }
        }
      }
    }
  }

  // Scan-линия с glow
  if (scanProgress < 1) {
    const gradient = ctx.createLinearGradient(cardX, scanY - 20, cardX, scanY + 20);
    gradient.addColorStop(0, 'rgba(34, 197, 94, 0)');
    gradient.addColorStop(0.5, 'rgba(34, 197, 94, 0.8)');
    gradient.addColorStop(1, 'rgba(34, 197, 94, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(cardX, scanY - 20, cardW, 40);
  }

  ctx.restore();

  // Бейдж ИИ
  if (localT > 5) {
    const badgeAlpha = Math.min(1, (localT - 5) / 0.5);
    ctx.save();
    ctx.globalAlpha = badgeAlpha;
    drawPill(ctx, CONFIG.W / 2, cardY - 50, 'ИИ-анализ выписки ✓', CONFIG.COLORS.success, CONFIG.COLORS.white, 32);
    ctx.restore();
  }
}

// Сцена 6: ФИНАЛ/CTA
function renderScene6(ctx: CanvasRenderingContext2D, t: number) {
  const localT = t - 31.0;
  const cx = CONFIG.W / 2;

  // Большая зелёная галочка
  const checkProgress = Math.min(1, localT / 1.5);
  const circleProgress = Math.min(1, localT / 1.0);

  // Круг
  ctx.beginPath();
  ctx.arc(cx, 550, 120, 0, Math.PI * 2 * easeOutCubic(circleProgress));
  ctx.strokeStyle = CONFIG.COLORS.success;
  ctx.lineWidth = 12;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Галочка (анимация штрихом)
  if (checkProgress > 0.3) {
    const galkaProgress = (checkProgress - 0.3) / 0.7;
    ctx.beginPath();
    ctx.strokeStyle = CONFIG.COLORS.success;
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Точки галочки
    const p1 = { x: cx - 50, y: 550 };
    const p2 = { x: cx - 10, y: 590 };
    const p3 = { x: cx + 60, y: 510 };

    if (galkaProgress < 0.5) {
      const p = galkaProgress * 2;
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(lerp(p1.x, p2.x, p), lerp(p1.y, p2.y, p));
    } else {
      const p = (galkaProgress - 0.5) * 2;
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineTo(lerp(p2.x, p3.x, p), lerp(p2.y, p3.y, p));
    }
    ctx.stroke();
  }

  // Текст
  if (localT > 1.5) {
    const textAlpha = Math.min(1, (localT - 1.5) / 0.5);
    ctx.save();
    ctx.globalAlpha = textAlpha;
    ctx.font = 'bold 52px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = CONFIG.COLORS.text;
    ctx.fillText('ГОТОВО!', cx, 750);
    ctx.font = 'bold 38px system-ui, sans-serif';
    ctx.fillStyle = CONFIG.COLORS.success;
    ctx.fillText('ТЫ СОХРАНИЛ ДО', cx, 820);
    ctx.font = 'bold 56px system-ui, sans-serif';
    ctx.fillText('10 000 ₽ В ГОД', cx, 890);
    ctx.restore();
  }

  // Пилюли с шагами
  if (localT > 2.5) {
    const pills = ['① Настройки → Подписки', '② Отмени лишнее', '③ Проверь выписку'];
    for (let i = 0; i < pills.length; i++) {
      const pillDelay = 2.5 + i * 0.5;
      if (localT > pillDelay) {
        const alpha = Math.min(1, (localT - pillDelay) / 0.3);
        ctx.save();
        ctx.globalAlpha = alpha;
        drawPill(ctx, cx, 1000 + i * 90, pills[i], CONFIG.COLORS.lightGray, CONFIG.COLORS.text, 30);
        ctx.restore();
      }
    }
  }

  // Плашка "СОХРАНИ" с прыгающей стрелкой
  if (localT > 4) {
    const bounce = Math.sin((localT - 4) * 4) * 10;
    const alpha = Math.min(1, (localT - 4) / 0.5);
    ctx.save();
    ctx.globalAlpha = alpha;

    // Стрелка вверх
    ctx.font = 'bold 48px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = CONFIG.COLORS.success;
    ctx.fillText('↑', cx, 1320 + bounce);

    // Плашка
    drawPill(ctx, cx, 1400, 'СОХРАНИ ↑', CONFIG.COLORS.success, CONFIG.COLORS.white, 38);
    ctx.restore();
  }
}

/* ============================================================
   RENDER — главная функция рендеринга кадра
   ============================================================ */
function render(ctx: CanvasRenderingContext2D, t: number) {
  // Фон
  ctx.fillStyle = CONFIG.COLORS.bg;
  ctx.fillRect(0, 0, CONFIG.W, CONFIG.H);

  // Прогресс-бар
  drawProgressBar(ctx, t);

  // Определяем текущую сцену
  if (t < 3.5) {
    renderScene1(ctx, t);
  } else if (t < 9.0) {
    renderScene2(ctx, t);
  } else if (t < 16.0) {
    renderScene3(ctx, t);
  } else if (t < 24.0) {
    renderScene4(ctx, t);
  } else if (t < 31.0) {
    renderScene5(ctx, t);
  } else if (t < 38.0) {
    renderScene6(ctx, t);
  }

  // Субтитры
  for (const cap of CONFIG.CAPTIONS) {
    if (t >= cap.start && t < cap.end) {
      drawCaption(ctx, cap.text, t, cap.start, cap.end);
      break;
    }
  }
}

/* ============================================================
   RECORDER — запись canvas в webm
   ============================================================ */

/* ============================================================
   INIT — React-компонент
   ============================================================ */
export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Предпросмотр
  const handlePreview = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (isPlaying) {
      cancelAnimationFrame(animRef.current);
      setIsPlaying(false);
      return;
    }

    setIsPlaying(true);
    startTimeRef.current = performance.now();

    const loop = () => {
      const elapsed = (performance.now() - startTimeRef.current) / 1000;
      if (elapsed >= CONFIG.DURATION) {
        render(ctx, CONFIG.DURATION);
        setIsPlaying(false);
        return;
      }
      render(ctx, elapsed);
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
  }, [isPlaying]);

  // Запись
  const handleRecord = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Проверяем поддержку
    const mimeTypes = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
    let selectedMime = '';
    for (const mime of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mime)) {
        selectedMime = mime;
        break;
      }
    }

    if (!selectedMime) {
      alert('Ваш браузер не поддерживает запись WebM. Используйте Chrome или Firefox.');
      return;
    }

    if (isRecording) return;
    setIsRecording(true);
    setIsPlaying(false);
    cancelAnimationFrame(animRef.current);

    const stream = canvas.captureStream(CONFIG.FPS);
    const recorder = new MediaRecorder(stream, { mimeType: selectedMime, videoBitsPerSecond: 8000000 });
    recorderRef.current = recorder;
    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'skrytye-podpiski.webm';
      a.click();
      URL.revokeObjectURL(url);
      setIsRecording(false);
    };

    recorder.start();

    // Рендер-цикл для записи
    startTimeRef.current = performance.now();
    const recordLoop = () => {
      const elapsed = (performance.now() - startTimeRef.current) / 1000;
      if (elapsed >= CONFIG.DURATION) {
        render(ctx, CONFIG.DURATION);
        recorder.stop();
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      render(ctx, elapsed);
      animRef.current = requestAnimationFrame(recordLoop);
    };
    animRef.current = requestAnimationFrame(recordLoop);
  }, [isRecording]);

  // Начальный рендер
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    render(ctx, 0);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f172a',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <h1 style={{ color: '#f8fafc', fontSize: '24px', marginBottom: '16px', textAlign: 'center' }}>
        🎬 Генератор видео «Скрытые подписки»
      </h1>

      <canvas
        ref={canvasRef}
        width={CONFIG.W}
        height={CONFIG.H}
        style={{
          maxHeight: '90vh',
          maxWidth: '100%',
          width: 'auto',
          height: 'auto',
          borderRadius: '12px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      />

      <div style={{
        display: 'flex',
        gap: '16px',
        marginTop: '20px',
        flexWrap: 'wrap',
        justifyContent: 'center',
      }}>
        <button
          onClick={handlePreview}
          style={{
            padding: '14px 28px',
            fontSize: '18px',
            fontWeight: 'bold',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            background: isPlaying ? '#EF4444' : '#3B82F6',
            color: 'white',
            transition: 'all 0.2s',
          }}
        >
          {isPlaying ? '⏸ Стоп' : '▶ Предпросмотр'}
        </button>

        <button
          onClick={handleRecord}
          disabled={isRecording}
          style={{
            padding: '14px 28px',
            fontSize: '18px',
            fontWeight: 'bold',
            border: 'none',
            borderRadius: '12px',
            cursor: isRecording ? 'wait' : 'pointer',
            background: isRecording ? '#6B7280' : '#22C55E',
            color: 'white',
            transition: 'all 0.2s',
            opacity: isRecording ? 0.7 : 1,
          }}
        >
          {isRecording ? '⏺ Запись... (~38 сек)' : '⏺ Записать и скачать WEBM'}
        </button>
      </div>

      <p style={{ color: '#94a3b8', marginTop: '12px', fontSize: '14px', textAlign: 'center' }}>
        Canvas 1080×1920 • 30fps • ~38 сек • VP9/VP8 WebM
      </p>
    </div>
  );
}
