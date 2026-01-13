# GPU Atlas — Dataset

This repository is the canonical, community-editable dataset for **GPU Atlas**.

It contains one TOML file per GPU, with structured, sourced specifications such as:

* VRAM
* CUDA cores
* Tensor cores
* RT cores
* SMs
* Memory bandwidth
* Release metadata

Each file represents a single GPU model and is intended to be:

* Human-authored
* Machine-validated
* Fully sourced
* Easy to review in pull requests

This dataset is consumed by the GPU Atlas site builder, which compiles it into a static, interactive reference at:

[https://gpu-atlas.github.io/](https://gpu-atlas.github.io/)

## Structure

```
data/
  nvidia/
    rtx-4090.toml
    rtx-4080-super.toml
  amd/
    rx-7900-xtx.toml
  intel/
    arc-a770.toml
```

Each file must include:

* Core specifications
* A stable model name
* At least one authoritative source

## Contributing

1. Fork the repo
2. Add or edit a file under `data/<vendor>/`
3. Include at least one source URL
4. Run validation (`bun run validate`)
5. (Optional) Install git hooks by running `bun install` (Lefthook runs via `prepare`)
5. Open a pull request

All submissions are validated in CI.

## License

This dataset is licensed under **Creative Commons Attribution 4.0 (CC BY 4.0)**.

You are free to use, modify, and redistribute this data for any purpose, provided you give appropriate credit to **GPU Atlas**.
