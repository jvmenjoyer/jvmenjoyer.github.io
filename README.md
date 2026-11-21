# Athly — дневник тренировок

PWA-дневник тренировок для iPhone: база упражнений с фото, готовые и свои
программы, учёт подходов, веса, повторений, RPE, суперсетов и разминочных
подходов. Работает офлайн, данные хранятся на устройстве.

## Возможности

- **876 упражнений** с двумя фото (public domain, free-exercise-db), поиск и
  фильтры по группам мышц и инвентарю. Названия на английском, техника — на русском.
- **Программы**: Full Body 3×, Upper/Lower 4×, Push/Pull/Legs 6×, Bro Split 5×,
  StrongLifts 5×5 + конструктор своих программ.
- **Тренировка**: упражнения из программы или с нуля, подходы (вес × повторы),
  RPE 1–10, разминочные подходы, метки суперсетов, заметки.
- **Календарь** и история, повтор тренировки.
- **Замеры**: вес тела, процент жира и обхваты + график.
- **Прогресс**: тоннаж по неделям, объём по группам мышц, личные рекорды.
- **Экспорт/импорт JSON**, данные только на телефоне.
- **PWA**: установка на домашний экран, офлайн-режим.

## Стек

React 19 + TypeScript, Vite, Tailwind CSS 4, Dexie (IndexedDB), Zustand,
Recharts, Zod, date-fns, vite-plugin-pwa. Тесты — Vitest, смоук — Playwright.

## Запуск

```bash
npm install
npm run dev
```

```bash
npm test        # юнит-тесты
npm run build   # production-сборка
npm run preview # просмотр сборки
```

## База упражнений

- Источник: [free-exercise-db](https://github.com/yuhonas/free-exercise-db)
  (The Unlicense, public domain).
- 876 упражнений, 1746 фото. Фото сжаты в WebP 480px (~22 МБ на всё).
- Скрипт подготовки: `scripts/prepare-exercises.mjs` — скачивает JSON и фото,
  сжимает их и кладёт в `public/exercises/` и `public/data/exercises.json`.
- Перевод: `scripts/translate-exercises.py` — локальная модель Argos en→ru,
  кэш переводов в `scripts/data/`. Запуск через `uv`:

```bash
uv run --python 3.12 --with argostranslate python scripts/translate-exercises.py
```

Перевод автоматический; ключевые упражнения можно поправить вручную в
`public/data/exercises.json`.

## Деплой

```bash
npm run build
npm run deploy
```

`npm run deploy` использует Netlify CLI. Проект нужно один раз привязать:

```bash
npx netlify link
```

## Ограничения

- Только килограммы и русский интерфейс.
- Нет синхронизации между устройствами — перенос через экспорт/импорт JSON.
- Таймер отдыха не входит в первую версию.
- Цены/рекорды считаются по введённым данным; база упражнений не является
  медицинской рекомендацией.
