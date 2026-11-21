# Иллюстрации упражнений: стиль, промты, пайплайн

Документ для перерисовки картинок упражнений. Рассчитан на то, что рисует Gemini
(или любая другая модель), а в приложение результат заезжает одной командой.

Сейчас в базе 876 упражнений и 1746 фото из free-exercise-db: это реальные
фотографии человека в зале, с разным светом, фоном и ракурсом. Выглядят они
чужеродно в тёмном интерфейсе с лаймовым акцентом. Задача — заменить фото на
единый набор плоских иллюстраций.

В каталоге приложения оставлено ядро — **200 упражнений**
(`scripts/art/core-exercises.mjs`), остальные 676 убраны из выдачи, но сохранены
в полной базе. У пользователей с историей они остаются в базе с флагом `hidden`,
поэтому старые тренировки не ломаются.

---

## 1. Что именно рисуем

Не все 200 сразу. Порядок такой:

| Этап | Что | Картинок |
| --- | --- | --- |
| 1 | 36 упражнений из готовых программ | 72 |
| 2 | остальные 164 из ядра | +328 |
| 3 | всё, что вне ядра | не рисуем — их нет в каталоге |

Первый этап — самое важное: 36 упражнений из пресетов человек видит в первый же
день. 36 × 2 кадра = 72 картинки, это реально сделать за пару вечеров.

Свои (кастомные) упражнения пользователей остаются без картинок — у них
показывается заглушка с гантелью, и это нормально.

---

## 2. Стиль

Плоская векторная иллюстрация, а не фото, не 3D и не мультик. Один и тот же
персонаж во всех картинках: нейтральное телосложение, без лица, без деталей.

### Палитра (строго)

| Роль | Цвет |
| --- | --- |
| Фон | `#0E1211` — почти чёрный с зелёным подтоном, ровная заливка |
| Тело | `#E8EDE5` — светлый тёплый серый, одна плоская заливка |
| Шорты | `#A9B4A7` — на пару тонов темнее тела |
| Акцент | `#C8F169` — лайм, ровно один смысл: снаряд |
| Тень | `#000000` 22% — одно мягкое эллиптическое пятно под ногами |

Больше цветов нет. Никаких градиентов, свечений, обводок, текстур и бликов.

### Правила

- **Акцент = снаряд.** Штанга, блины, гантели, рукоятка блока, упор тренажёра —
  лаймовые. У упражнений с весом тела лаймовым становится работающая конечность
  (ноги в подъёме ног в висе, руки в подтягиваниях). Тело целиком лаймовым не бывает.
- **Один персонаж.** Одинаковые пропорции, рост, поза головы, шорты. Меняется
  только поза.
- **Два кадра = анимация.** Кадр 0 — начало повторения, кадр 1 — конец. Камера,
  масштаб, положение тела на кадре не меняются, иначе приложение будет «дёргаться»
  при переключении. Одинаковые картинки для статических упражнений (планка) —
  нормально, импорт продублирует кадр.
- **Ничего не обрезано.** Фигура целиком, от макушки до стоп, с запасом 8% по краям.
- **Кроп в квадрат.** В списке упражнений картинка показывается квадратом 56×56,
  поэтому вся фигура должна помещаться в центральный квадрат 4:3. Не растягивай
  руки и штангу к краям.
- **4:3, горизонтально.** 1536×1152 или больше. В приложении режется до 480–720 px
  по ширине, так что мелкие детали всё равно пропадут — не рисуй их.

---

## 3. Мастер-промт

Английский, потому что модель лучше держит стиль. Копируется целиком, один раз.
В `<VIEW>` подставляется ракурс упражнения: `side view`, `three-quarter front view`
или `front view`.

```text
You are designing one consistent illustration set for a dark-mode strength-training app.
Every image in the set must look like it came from the same hand.

STYLE
Flat 2D vector illustration, editorial fitness pictogram. Clean geometric shapes,
uniform line weight, no gradients, no textures, no 3D, no photorealism, no cartoon
faces. Premium minimal iconography.

CANVAS
4:3 landscape, 1536x1152. Solid background colour #0E1211 filling the whole frame.
The athlete is centred horizontally, feet on an implied ground line at 88% of the
frame height, top of the head at about 8%. At least 8% empty margin on every side.
The entire body must fit inside the central square area, so that a 1:1 centre crop
still shows the full figure from head to toe.

FIGURE
One adult athlete, neutral and androgynous, medium athletic build. The body is one
single flat fill of light grey #E8EDE5 — no shading, no muscle striations, no skin
texture, no outline. The head is a smooth oval with no facial features, no hair
detail, no ears. Simple fitted shorts in slightly darker grey #A9B4A7. Hands are
simplified shapes without separated fingers; feet are simplified too.

ACCENT
Exactly one accent colour: lime #C8F169. Use it only for the object being moved —
barbell, weight plates, dumbbells, cable handle, machine pad. For bodyweight
exercises use lime for the limb that does the work (the legs in a hanging leg raise,
the arms in a pull-up). Never fill the whole body with lime. No other colours.

LIGHT
No light source, no gradients, no glow, no rim light, no reflections. One soft
elliptical contact shadow, black at 22% opacity, directly under the feet. Nothing else.

CAMERA
<VIEW>, orthographic-like, no perspective distortion, no lens blur. Full body, nothing
cropped, no foreground objects.

FORBIDDEN
text, letters, numbers, labels, arrows, UI elements, watermarks, logos, borders,
frames, photographic realism, 3D render, glossy plastic, gradients, neon glow,
multiple people, extra limbs, motion blur, busy gym background, gym equipment
clutter, floor lines, mirrors, sweat, faces.

OUTPUT
One single image. No explanation, no text.
```

### Кадр 1

```text
Keep the exact same athlete, art style, palette, line weight, camera and framing as
the reference image. Same 4:3 canvas, same background, same scale and position.

Exercise: <NAME_EN>.
This is FRAME 1 of 2 — the start position: <START>.

Change nothing except the pose.
```

### Кадр 2

```text
Same image, same athlete, same style, same camera, same framing, same colours,
same scale and position.

Change ONLY the pose to FRAME 2 of 2 — the end position of the same repetition:
<END>.

Everything else must stay pixel-identical.
```

`<START>` и `<END>` для всех 36 упражнений уже написаны — см. таблицу в разделе 5.
Отдельно ничего придумывать не нужно.

---

## 4. Как рисовать в Gemini, чтобы стиль не поехал

Главная проблема таких наборов — дрейф стиля к 10-й картинке. Лечится тем, что
все изображения делаются **в одном чате**, и каждое новое «редактирует» предыдущее.

1. Новый чат, режим с генерацией изображений (Gemini Pro / Nano Banana Pro).
2. Отправь мастер-промт + `Exercise: Barbell Squat`, кадр 1. Получишь эталон.
3. Не понравилось — правь словами в этом же чате, пока не станет хорошо.
   Эталон важнее скорости: по нему будут рисоваться все остальные.
4. Дальше цикл по упражнениям:
   - прикрепи **эталон** (или предыдущую картинку) к сообщению;
   - вставь блок «Кадр 1» с нужными `<START>`;
   - сохрани результат как `<ID>__0.png`;
   - попроси «Кадр 2» в том же сообщении или следующим — сохрани как `<ID>__1.png`.
5. Раз в 5–6 упражнений проверяй, что персонаж не похудел/не потолстел и шорты
   того же цвета. Если поехало — вернись к эталону и продолжай от него.

Полезные команды, когда модель хулиганит:

- стало фотореалистичным → `Flat vector only. No photo, no 3D, no shading.`
- обрезало голову или штангу → `Zoom out slightly. The entire body and the whole barbell must be inside the frame with margin.`
- добавило текст или подписи → `Remove all text and labels. Image only.`
- поменяло персонажа → `Use the attached reference as the character. Do not redesign the body, the shorts or the colours.`
- не тот размер → `4:3 landscape aspect ratio, 1536x1152.`

---

## 5. Список упражнений и позы

Файл-источник: `scripts/art/batch-1.json`. Ниже те же данные для копирования.
`frames: 1` — статическое упражнение, второй кадр не нужен.

| ID | Упражнение | Ракурс | Кадров |
| --- | --- | --- | --- |
| `Barbell_Squat` | Приседания со штангой | side | 2 |
| `Barbell_Bench_Press_-_Medium_Grip` | Жим лёжа средним хватом | side | 2 |
| `Bent_Over_Barbell_Row` | Тяга штанги в наклоне | side | 2 |
| `Plank` | Планка | side | 1 |
| `Barbell_Deadlift` | Становая тяга со штангой | side | 2 |
| `Standing_Military_Press` | Жим стоя | side | 2 |
| `Wide-Grip_Lat_Pulldown` | Тяга верхнего блока широким хватом | 3/4 | 2 |
| `Hanging_Leg_Raise` | Подъём ног в висе | side | 2 |
| `Leg_Press` | Жим ногами | side | 2 |
| `Incline_Dumbbell_Press` | Жим гантелей на наклонной | side | 2 |
| `Seated_Cable_Rows` | Тяга нижнего блока сидя | side | 2 |
| `Dumbbell_Shoulder_Press` | Жим гантелей на плечи | 3/4 | 2 |
| `Barbell_Curl` | Сгибание рук со штангой | side | 2 |
| `Triceps_Pushdown` | Разгибание рук на блоке | side | 2 |
| `Romanian_Deadlift` | Румынская становая тяга | side | 2 |
| `Lying_Leg_Curls` | Сгибание ног лёжа | side | 2 |
| `Standing_Calf_Raises` | Подъёмы на носки стоя | side | 2 |
| `Side_Lateral_Raise` | Махи в стороны | front | 2 |
| `Face_Pull` | Тяга к лицу | side | 2 |
| `Hammer_Curls` | Сгибание рук молотковым хватом | 3/4 | 2 |
| `Dips_-_Triceps_Version` | Отжимания на брусьях на трицепс | side | 2 |
| `Barbell_Lunge` | Выпады со штангой | side | 2 |
| `Leg_Extensions` | Разгибание ног | side | 2 |
| `Seated_Leg_Curl` | Сгибание ног сидя | side | 2 |
| `Seated_Calf_Raise` | Подъёмы на носки сидя | side | 2 |
| `Seated_Barbell_Military_Press` | Жим штанги сидя | side | 2 |
| `Pullups` | Подтягивания | front | 2 |
| `Cable_Crossover` | Кроссовер на блоке | front | 2 |
| `Close-Grip_Barbell_Bench_Press` | Жим лёжа узким хватом | side | 2 |
| `One-Arm_Dumbbell_Row` | Тяга гантели одной рукой в наклоне | side | 2 |
| `Reverse_Flyes` | Разведения в наклоне | 3/4 | 2 |
| `Front_Squat_Clean_Grip` | Фронтальные приседания | side | 2 |
| `Barbell_Hip_Thrust` | Ягодичный мост со штангой | side | 2 |
| `Dips_-_Chest_Version` | Отжимания на брусьях на грудь | side | 2 |
| `T-Bar_Row_with_Handle` | Тяга Т-грифа с рукояткой | side | 2 |
| `EZ-Bar_Curl` | Сгибание рук с EZ-грифом | 3/4 | 2 |

Позы (подставляются в `<START>` и `<END>`):

```text
Barbell_Squat
  1: standing upright, barbell resting across the upper back, feet shoulder-width apart, toes slightly out
  2: full squat to parallel depth, hips back and down, knees tracking over the toes, torso leaning forward about 40 degrees, barbell still on the upper back

Barbell_Bench_Press_-_Medium_Grip
  1: lying on a flat bench, feet planted on the floor, barbell at chest level, elbows bent about 60 degrees from the torso
  2: arms extended vertically over the chest, barbell directly above the shoulders, elbows just short of locked

Bent_Over_Barbell_Row
  1: hinged forward with the torso at about 45 degrees, knees slightly bent, barbell hanging at arm's length below the shoulders
  2: barbell pulled to the lower ribs, elbows driven back past the torso, back flat and neutral

Plank
  1: on the floor on forearms and toes, elbows under the shoulders, body in one straight line from heels to head
  (кадр один, второй дублируется автоматически)

Barbell_Deadlift
  1: barbell on the floor over mid-foot, hips high, knees bent, arms straight, flat back
  2: standing tall with the hips fully extended, barbell at mid-thigh, shoulders back

Standing_Military_Press
  1: standing, barbell racked at collarbone height, elbows slightly in front of the bar
  2: barbell locked out overhead, arms straight, ribs down, standing tall

Wide-Grip_Lat_Pulldown
  1: seated at a lat pulldown station, thighs under the knee pad, arms extended overhead holding a wide bar
  2: bar pulled to the upper chest, elbows down and back, chest lifted

Hanging_Leg_Raise
  1: hanging from a pull-up bar with straight arms, legs straight down
  2: legs raised to horizontal, toes at hip height, torso still

Leg_Press
  1: seated in a 45-degree leg press machine, knees bent deeply toward the chest, feet on the platform
  2: legs extended, knees almost straight, platform pushed away

Incline_Dumbbell_Press
  1: lying on a bench inclined 30 degrees, dumbbells at chest level, elbows bent
  2: dumbbells pressed up over the upper chest, arms extended

Seated_Cable_Rows
  1: seated on a cable row bench, knees slightly bent, arms extended forward holding a handle
  2: handle pulled to the abdomen, elbows close to the body, chest up

Dumbbell_Shoulder_Press
  1: seated on an upright bench, dumbbells at ear height, elbows bent
  2: dumbbells pressed overhead, arms extended

Barbell_Curl
  1: standing, barbell held at thigh level with an underhand grip, elbows at the sides
  2: barbell curled to chin height, elbows fixed at the sides, forearms vertical

Triceps_Pushdown
  1: standing at a cable station, elbows bent to 90 degrees, hands at chest height holding a rope
  2: arms extended down, rope at thigh level, elbows pinned to the sides

Romanian_Deadlift
  1: standing upright with a barbell at the thighs, shoulders back
  2: hips pushed back, torso hinged forward about 45 degrees, bar at mid-shin, knees softly bent, flat back

Lying_Leg_Curls
  1: lying face down on a leg curl machine, legs straight, pad at the heels
  2: heels curled toward the glutes, knees bent about 100 degrees, hips flat on the pad

Standing_Calf_Raises
  1: standing on the balls of the feet on a raised platform, heels lowered below the platform
  2: standing on the toes at full plantar flexion, body straight

Side_Lateral_Raise
  1: standing, dumbbells at the sides at thigh level, slight bend in the elbows
  2: arms raised out to the sides to shoulder height, palms down, slight elbow bend

Face_Pull
  1: standing at a cable set at face height, arms extended forward holding a rope
  2: rope pulled toward the face, elbows high and wide, hands beside the ears

Hammer_Curls
  1: standing, dumbbells at the sides with a neutral grip, elbows at the sides
  2: dumbbells curled to shoulder height, neutral grip maintained, elbows fixed

Dips_-_Triceps_Version
  1: supported on parallel bars with straight arms, body upright, legs bent behind
  2: elbows bent to 90 degrees, body lowered between the bars, torso upright

Barbell_Lunge
  1: standing with a barbell on the upper back, feet together
  2: split-stance lunge, front knee bent 90 degrees, back knee just above the floor, torso upright

Leg_Extensions
  1: seated in a leg extension machine, knees bent 90 degrees, shins behind the pad
  2: legs extended forward, shins horizontal

Seated_Leg_Curl
  1: seated in a leg curl machine, legs extended forward, pad on top of the ankles
  2: heels curled under the seat, knees bent about 90 degrees

Seated_Calf_Raise
  1: seated in a calf raise machine, pads on the knees, heels lowered below the platform
  2: heels raised as high as possible, toes on the platform

Seated_Barbell_Military_Press
  1: seated on an upright bench, barbell at collarbone height, elbows under the bar
  2: barbell locked out overhead, arms extended, back against the pad

Pullups
  1: hanging from a pull-up bar with an overhand grip, arms straight, legs together
  2: chin above the bar, elbows down, shoulders pulled toward the bar

Cable_Crossover
  1: standing between two cable stacks, arms out wide at shoulder height, slight elbow bend
  2: hands brought together in front of the chest, arms almost straight

Close-Grip_Barbell_Bench_Press
  1: lying on a flat bench, narrow grip, barbell at the chest, elbows tucked close to the body
  2: arms extended over the chest, barbell above the shoulders

One-Arm_Dumbbell_Row
  1: one hand and knee supported on a bench, torso horizontal, dumbbell hanging below the shoulder
  2: dumbbell pulled to the hip, elbow driven back

Reverse_Flyes
  1: hinged forward with the torso nearly horizontal, dumbbells hanging below the chest
  2: arms raised out to the sides, dumbbells at shoulder height

Front_Squat_Clean_Grip
  1: standing with a barbell racked on the front delts, elbows high
  2: full squat to parallel depth, torso upright, elbows high, bar on the front delts

Barbell_Hip_Thrust
  1: upper back on a bench, feet flat on the floor, barbell across the hips, hips near the floor
  2: hips extended so the torso and thighs form a straight line, barbell over the hips

Dips_-_Chest_Version
  1: supported on parallel bars with straight arms, torso leaned forward, legs bent behind
  2: elbows bent to 90 degrees, chest lowered between the bars, torso leaned forward

T-Bar_Row_with_Handle
  1: standing over a T-bar row machine, torso hinged about 45 degrees, arms extended down holding the handle
  2: handle pulled to the lower chest, elbows back

EZ-Bar_Curl
  1: standing, EZ bar held at thigh level with a semi-supinated grip
  2: EZ bar curled to chin height, elbows fixed at the sides
```

---

## 6. Сдача работы и импорт

Файлы складываются в одну папку с именами `<ID>__<кадр>.png`:

```text
athly-art/
  Barbell_Squat__0.png
  Barbell_Squat__1.png
  Barbell_Deadlift__0.png
  ...
```

Имя упражнения — строго ID из таблицы выше (`Barbell_Squat`, а не «приседания»).
Расширение любое из `.png`, `.jpg`, `.webp`. Прозрачный фон не нужен и не помешает —
скрипт всё равно заливает фон, поэтому лучше сразу рисовать на `#0E1211`.

Дальше:

```powershell
npm run art:import -- --src "C:\путь\к\athly-art" --dry
```

`--dry` показывает, что распознано, чего не хватает и что будет перезаписано.
Если всё сходится — та же команда без `--dry`. Скрипт:

- сжимает в WebP шириной 720 px;
- кладёт файлы в `public/exercises/<id>/<кадр>-art<N>.webp`;
- обновляет `public/data/exercises.json`;
- поднимает `CATALOG_VERSION` в `src/db/catalog.ts`.

Последние два пункта критичны: без них у пользователей останутся старые фото.
`-art<N>` в имени файла обходит кеш Service Worker, а версия каталога заставляет
приложение перечитать список упражнений из IndexedDB.

Проверка локально:

```powershell
npm run dev
```

Открыть `/exercises`, `/exercises/Barbell_Squat` и программу Full Body 3×.
На детальной странице кадры сами переключаются раз в 1.4 с — сразу видно, не
«прыгает» ли фигура между кадрами.

Публикация:

```powershell
npm run build
npm run deploy
```

Старые фото никуда не деваются — они лежат в git и в `public/exercises/`.
Если новая версия не понравится, достаточно откатить `exercises.json` и
`CATALOG_VERSION`.

---

## 7. Чеклист одной картинки

- [ ] 4:3, горизонтально, 1536×1152 или больше
- [ ] фон ровно `#0E1211`, без градиента и текстуры
- [ ] тело `#E8EDE5`, шорты `#A9B4A7`, акцент `#C8F169` только на снаряде
- [ ] ни одного другого цвета
- [ ] фигура целиком, с запасом по краям, влезает в центральный квадрат
- [ ] нет текста, воды, рамок, лиц и фона зала
- [ ] кадры 0 и 1 отличаются только позой, масштаб и положение совпадают
- [ ] персонаж тот же, что в эталоне: те же пропорции и шорты
