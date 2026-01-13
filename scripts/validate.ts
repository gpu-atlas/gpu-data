import { readdir } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, 'data');

const REQUIRED_FIELDS = new Set([
    'model',
    'vendor',
    'architecture',
    'series',
    'segment',
    'released',
    'vram_gb',
    'vram_type',
    'memory_bus_bits',
    'memory_bandwidth_gbps',
    'base_clock_mhz',
    'boost_clock_mhz',
    'tdp_watts',
    'release',
    'sources',
]);

const VENDOR_FOLDER_TO_NAME: Record<string, string> = {
    nvidia: 'NVIDIA',
    amd: 'AMD',
    intel: 'Intel',
};

const ALLOWED_SEGMENTS = new Set(['desktop', 'laptop', 'workstation', 'datacenter']);

const KEBAB_CASE_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*\.toml$/;
const RELEASE_RE = /^\d{4}-\d{2}$/;

function fail(message: string): never {
    console.error(`Validation error: ${message}`);
    process.exit(1);
}

async function* walk(dir: string): AsyncGenerator<string> {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            yield* walk(full);
        } else {
            yield full;
        }
    }
}

function expectNumber(value: unknown, label: string, integer = true) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        fail(`${label} must be a number.`);
    }
    if (value <= 0) {
        fail(`${label} must be > 0.`);
    }
    if (integer && !Number.isInteger(value)) {
        fail(`${label} must be an integer.`);
    }
}

function expectString(value: unknown, label: string) {
    if (typeof value !== 'string' || value.trim().length === 0) {
        fail(`${label} must be a non-empty string.`);
    }
}

function expectBoolean(value: unknown, label: string) {
    if (typeof value !== 'boolean') {
        fail(`${label} must be a boolean.`);
    }
}

function validateVendorSpecificSpecs(data: Record<string, unknown>, vendor: string, rel: string) {
    if (vendor === 'NVIDIA') {
        expectNumber(data.cuda_cores, `${rel}: cuda_cores`, true);
        expectNumber(data.tensor_cores, `${rel}: tensor_cores`, true);
        expectNumber(data.rt_cores, `${rel}: rt_cores`, true);
        expectNumber(data.sms, `${rel}: sms`, true);
        expectNumber(data.rops, `${rel}: rops`, true);
    }
}

async function main() {
    let found = 0;
    for await (const file of walk(DATA_DIR)) {
        if (!file.endsWith('.toml')) continue;
        found += 1;
        const rel = path.relative(ROOT, file);
        const parts = rel.split(path.sep);
        const vendorFolder = parts[1];
        const fileName = parts[2];

        if (!vendorFolder || !fileName) {
            fail(`${rel} must be under data/<vendor>/<file>.toml.`);
        }

        if (!KEBAB_CASE_RE.test(fileName)) {
            fail(`${rel} filename must be kebab-case.`);
        }

        const vendorName = VENDOR_FOLDER_TO_NAME[vendorFolder];
        if (!vendorName) {
            fail(`${rel} must live under data/nvidia, data/amd, or data/intel.`);
        }

        const text = await Bun.file(file).text();
        const data = Bun.TOML.parse(text) as Record<string, unknown>;

        const keys = Object.keys(data);
        for (const key of REQUIRED_FIELDS) {
            if (!(key in data)) {
                fail(`${rel} missing required field: ${key}`);
            }
        }
        const allowedFields = new Set(REQUIRED_FIELDS);
        if (data.vendor === 'NVIDIA') {
            allowedFields.add('cuda_cores');
            allowedFields.add('tensor_cores');
            allowedFields.add('rt_cores');
            allowedFields.add('sms');
            allowedFields.add('rops');
        }
        for (const key of keys) {
            if (!allowedFields.has(key)) {
                fail(`${rel} has unexpected field: ${key}`);
            }
        }

        expectString(data.model, `${rel}: model`);
        expectString(data.vendor, `${rel}: vendor`);
        if (data.vendor !== vendorName) {
            fail(`${rel} vendor must be "${vendorName}" for folder ${vendorFolder}.`);
        }
        expectString(data.architecture, `${rel}: architecture`);
        expectNumber(data.series, `${rel}: series`, true);
        expectString(data.segment, `${rel}: segment`);
        if (!ALLOWED_SEGMENTS.has(data.segment as string)) {
            fail(`${rel} segment must be one of: ${Array.from(ALLOWED_SEGMENTS).join(', ')}.`);
        }
        expectBoolean(data.released, `${rel}: released`);

        expectNumber(data.vram_gb, `${rel}: vram_gb`, true);
        expectString(data.vram_type, `${rel}: vram_type`);
        expectNumber(data.memory_bus_bits, `${rel}: memory_bus_bits`, true);
        expectNumber(data.memory_bandwidth_gbps, `${rel}: memory_bandwidth_gbps`, false);

        validateVendorSpecificSpecs(data, data.vendor as string, rel);

        expectNumber(data.base_clock_mhz, `${rel}: base_clock_mhz`, true);
        expectNumber(data.boost_clock_mhz, `${rel}: boost_clock_mhz`, true);
        expectNumber(data.tdp_watts, `${rel}: tdp_watts`, true);

        expectString(data.release, `${rel}: release`);
        if (data.released === true) {
            if (!RELEASE_RE.test(data.release as string)) {
                fail(`${rel} release must be YYYY-MM for released GPUs.`);
            }
        } else {
            if ((data.release as string) !== 'TBD') {
                fail(`${rel} release must be "TBD" when released is false.`);
            }
        }

        if (!Array.isArray(data.sources) || data.sources.length === 0) {
            fail(`${rel} sources must be a non-empty array.`);
        }
        for (const [index, source] of data.sources.entries()) {
            if (typeof source !== 'string' || source.trim().length === 0) {
                fail(`${rel} sources[${index}] must be a non-empty string.`);
            }
            if (!/^https?:\/\//.test(source)) {
                fail(`${rel} sources[${index}] must start with http or https.`);
            }
        }
    }

    if (found === 0) {
        fail('No TOML files found under data/.');
    }

    console.log(`Validation passed (${found} file${found === 1 ? '' : 's'}).`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
