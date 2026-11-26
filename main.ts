// main.ts — entrypoint. Node 22, standard library only.
// Copies game/ and screenshots/ into MAKEFUN_OUTPUT_DIR and writes dossier.json.
import { mkdirSync, cpSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-game.ts";

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(process.env.MAKEFUN_OUTPUT_DIR || "/output");
mkdirSync(out, { recursive: true });
if (existsSync(join(here, "game"))) cpSync(join(here, "game"), join(out, "game"), { recursive: true });
if (existsSync(join(here, "screenshots"))) cpSync(join(here, "screenshots"), join(out, "screenshots"), { recursive: true });
const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(out, "dossier.json"), JSON.stringify(dossier, null, 2) + "\n");
console.log("wrote dossier to " + join(out, "dossier.json"));
