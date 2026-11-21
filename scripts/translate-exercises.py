import json
import os
import sys
import time
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ROOT, "scripts", "data")
RAW = os.path.join(DATA_DIR, "exercises.raw.json")
OUT = os.path.join(ROOT, "public", "data", "exercises.json")
CACHE = os.path.join(DATA_DIR, "translations.en-ru.json")

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(os.path.dirname(OUT), exist_ok=True)

if not os.path.exists(RAW):
    print("Скачиваю исходный JSON...")
    with urllib.request.urlopen(
        "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json"
    ) as response:
        raw = json.loads(response.read().decode("utf-8"))
    with open(RAW, "w", encoding="utf-8") as handle:
        json.dump(raw, handle, ensure_ascii=False)
else:
    with open(RAW, "r", encoding="utf-8") as handle:
        raw = json.load(handle)

print(f"Упражнений: {len(raw)}")

cache = {}
if os.path.exists(CACHE):
    with open(CACHE, "r", encoding="utf-8") as handle:
        cache = json.load(handle)
    print(f"Кэш переводов: {len(cache)}")

import argostranslate.package as package
from argostranslate import translate

languages = {language.code: language for language in translate.get_installed_languages()}
if "en" not in languages or "ru" not in languages:
    print("Устанавливаю модель en → ru...")
    package.update_package_index()
    available = package.get_available_packages()
    candidate = next(
        (item for item in available if item.from_code == "en" and item.to_code == "ru"),
        None,
    )
    if candidate is None:
        sys.exit("Модель en → ru не найдена")
    package.install_from_path(candidate.download())
    languages = {language.code: language for language in translate.get_installed_languages()}

english = languages["en"]
russian = languages["ru"]
translator = english.get_translation(russian)
if translator is None:
    sys.exit("Переводчик en → ru не создан")

errors = 0


def tr(text: str) -> str:
    global errors
    if not text:
        return text
    if text in cache:
        return cache[text]
    try:
        result = translator.translate(text).strip()
    except Exception as error:  # noqa: BLE001
        errors += 1
        print(f"  ошибка перевода: {error}")
        return text
    if not result:
        return text
    cache[text] = result
    return result


started = time.time()
result = []

for index, item in enumerate(raw):
    name_ru = tr(item.get("name", ""))
    instructions = item.get("instructions") or []
    instructions_ru = [tr(line) for line in instructions]

    result.append(
        {
            "id": item["id"],
            "nameEn": item.get("name", ""),
            "nameRu": name_ru,
            "instructionsEn": instructions,
            "instructionsRu": instructions_ru,
            "primaryMuscles": item.get("primaryMuscles") or [],
            "secondaryMuscles": item.get("secondaryMuscles") or [],
            "equipment": item.get("equipment") or "body only",
            "level": item.get("level") or "beginner",
            "mechanic": item.get("mechanic"),
            "force": item.get("force"),
            "category": item.get("category") or "strength",
            "images": [
                f"/exercises/{image.split('/')[0]}/{frame}.webp"
                for frame, image in enumerate(item.get("images") or [])
            ],
        }
    )

    if (index + 1) % 25 == 0 or index + 1 == len(raw):
        with open(CACHE, "w", encoding="utf-8") as handle:
            json.dump(cache, handle, ensure_ascii=False)
        elapsed = time.time() - started
        print(
            f"  {index + 1}/{len(raw)} · кэш {len(cache)} · ошибок {errors} · {elapsed:.0f} c"
        )

with open(OUT, "w", encoding="utf-8") as handle:
    json.dump(result, handle, ensure_ascii=False)

print(f"Готово: {OUT}")
print(f"Уникальных строк переведено: {len(cache)}")
print(f"Ошибок: {errors}")
