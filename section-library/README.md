# Reusable Section Library

This folder is the starting point for a private library of reusable website sections.

## Purpose

Use this library to save production-ready sections that can be adapted across client projects without rebuilding layouts from scratch.

## Structure

- `sections/` holds section categories and individual section entries.
- `assets/` holds shared images, textures, icons, and reference files used by more than one section.
- `manifests/` holds reusable metadata records if you want a searchable catalog later.
- `templates/` holds starter files for new section entries.

## Recommended workflow

1. Pick a category inside `sections/`.
2. Create a new folder for the section, such as `hero-southwest-landscaper`.
3. Add the section markup, notes, and any section-specific assets.
4. Record where the section has been used and what kinds of businesses it fits best.

## Suggested section entry shape

Each reusable section can eventually include:

- `section.html` for the markup
- `section.css` for isolated styling
- `section.js` for optional behavior
- `notes.md` for usage guidance
- `preview.png` for a visual snapshot
- `manifest.json` for searchable metadata

## Naming

Prefer clear, searchable names:

- `hero-premium-contractor`
- `services-three-card-medical`
- `faq-local-seo`
- `cta-owner-led-trust`

Keep names lowercase and use hyphens.
