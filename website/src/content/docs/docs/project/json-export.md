---
title: JSON export
description: A static, build-time JSON feed of published recipes.
---

Each successful build writes `api/recipes.json` beside the HTML pages. It is an ordinary static JSON file, not a backend API service.

The export contains every **active** recipe in stable title order. Draft and archived recipes are excluded, so this file is not a complete backup of the source collection.

Scripts and integrations can fetch the file to read recipe titles, URLs, Markdown bodies, ingredients, supported metadata, and generated image details. Optional fields are omitted when they have no value.

The current compatibility policy is additive: consumers should ignore fields they do not recognize. A breaking change requires an explicit migration decision and an appropriate semantic-version change.

The exported fields are `slug`, `url`, `title`, `body`, and optional `description`, `aliases`, `tags`, `categories`, `cuisine`, `meal`, `ingredients`, `prepMinutes`, `cookMinutes`, `totalMinutes`, `servings`, `difficulty`, `favorite`, `source`, `created`, `updated`, and `image`.
