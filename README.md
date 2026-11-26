# STEEL DECK — Storm Carrier Ops

[![make.fun](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/c/best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/jonjet155/steel-deck-flight-game/rank.svg)](https://make.fun/c/best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/jonjet155/steel-deck-flight-game/reward.svg)](https://make.fun/c/best-flight-game-20261126-0057)

A storm-dusk carrier-ops flight game for the make.fun best-flight-game-20261126-0057 competition.

You are a pilot of **Elang Badai (Storm Eagle)** squadron, flying off the storm carrier **KRI HALILINTAR** in the fictional Ember Archipelago. Thread storm cells, run supplies to a windswept island strip, patrol the archipelago at night — and bring her home with a 3-wire trap landing in the storm.

## How to play

- **Fly:** W/S throttle, Arrow keys pitch & bank, Shift afterburner, Space airbrake/flare.
- **Trap:** follow the FLOLS meatball (red = low, amber = on glide, green = high) onto the moving deck. Catch **WIRE 3 (centre) = PERFECT +250**, WIRE 2 = +150, WIRE 1 = +100. Miss all three and you **BOLTER** — go around.
- **Launch:** press **C** on deck for a catapult launch with a steam burst off the bow.
- **Fuel vs speed is a real decision:** afterburner is fast but burns fuel; fuel only refills on deck or at the island strip. The long safe route vs the short storm cut is your call.
- **Damage:** 3 hull hearts. Storm-cell hits and hard landings damage the plane. Lose all three and you are **CRASHED — hull breached**.

## Structure

- **4 sorties:** 1. STORM INTERCEPT — thread 6 storm cells; 2. SUPPLY RUN — deliver cargo to the island strip in the squall; 3. NIGHT PATROL — patrol the archipelago and light the deck; 4. TRAP FINALE — 3-wire trap landing in the storm.
- **3 planes:** Camar-7 (light interceptor), Rajawali-9 (strike), Albatros-3 (heavy lifter) — different speed, fuel and handling.
- **12 upgrades:** arrestor hook, catapult bridle, bigger tank, storm radar, landing lights, reinforced gear, night goggles, ship radio, cockpit heater, fast propeller, cargo net, reinforced hull.
- **6 storm cells** and **2 storm bosses:** The Eye and the Night Squall.
- **Deck ops alive:** deck crew, amber deck lights, island superstructure, catapult steam, bow spray, waves, rain, lightning.

## Tech

Hand-rolled vanilla WebGL — no libraries, no external loads. Own vec3/mat4 math, own shaders, own low-poly meshes. Synthesized WebAudio only (engine hum, wind, thunder, trap clang, catapult hiss). Press **M** to mute.

## Run it

```sh
node serve.ts   # serves game/ on http://localhost:8080
```

Or build the entry dossier:

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Screenshots

1. `1-cover.jpg` — mid-flight chase view, carrier deck + FLOLS ahead
2. `2-trap.jpg` — the trap moment, WIRE 3 PERFECT +250
3. `3-storm.jpg` — storm intercept, lightning and rain
4. `4-map.jpg` — mission select: 4 sorties, 3 planes, 12 upgrades
