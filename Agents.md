# gpu-data Agents Guide

This repo is the canonical GPU dataset. Do not add build logic or UI code here.

## Data layout
- One GPU per TOML file.
- Group by vendor folder: `data/nvidia`, `data/amd`, `data/intel`.
- File names are kebab-case model slugs (example: `rtx-4080-super.toml`).

## Requirements
- Include at least one source URL in `sources`.
- Use consistent units and field names across entries.
- Keep edits atomic: one GPU or one small batch per change.

## Do not
- Do not edit generated artifacts.
- Do not change build scripts or site code here.
