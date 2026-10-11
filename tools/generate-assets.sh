#!/usr/bin/env bash
set -euo pipefail

# One-time production script. The generated files are committed; npm builds do
# not invoke this script or require the authoring tools.
root="$(cd "$(dirname "$0")/.." && pwd)"
out="$root/public/assets"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
mkdir -p "$out/gems" "$out/fx" "$out/audio"

kinds=(ruby amber citrine jade beryl sapphire amethyst)
base=("#d92f58" "#f08a32" "#f5d447" "#39c985" "#34c7c9" "#4386ea" "#a75de0")
dark=("#681733" "#713d19" "#76651c" "#145d42" "#176165" "#183f7c" "#542771")
light=("#ff9aaa" "#ffd08b" "#fff5a0" "#a6ffd0" "#a5ffff" "#a8caff" "#e0adff")

draw_gem() {
  local name="$1" strain="$2" idx="$3" cfg="$work/draw.json" log="$work/actions.json"
  local file="$out/gems/${name}-${strain}.png"
  printf '{"width":64,"height":64,"background":"transparent","actions":"%s","preview":"%s","layers":"%s"}\n' "$log" "$file" "$work/layers.json" > "$cfg"
  draw --config "$cfg" init >/dev/null
  # Layered, jewel-like silhouette: each kind gets a recognisable geometry.
  case "$idx" in
    0) draw --config "$cfg" fill-circle --cx 32 --cy 32 --r 28 --color "${dark[$idx]}" >/dev/null; draw --config "$cfg" fill-circle --cx 32 --cy 31 --r 24 --color "${base[$idx]}" >/dev/null ;;
    1) draw --config "$cfg" fill-rect --x 10 --y 18 --width 44 --height 28 --color "${dark[$idx]}" >/dev/null; draw --config "$cfg" fill-rect --x 15 --y 13 --width 34 --height 38 --color "${base[$idx]}" >/dev/null ;;
    2) draw --config "$cfg" fill-rect --x 8 --y 27 --width 48 --height 10 --color "${dark[$idx]}" >/dev/null; draw --config "$cfg" fill-rect --x 16 --y 16 --width 32 --height 32 --color "${base[$idx]}" >/dev/null ;;
    3) draw --config "$cfg" fill-circle --cx 32 --cy 34 --r 26 --color "${dark[$idx]}" >/dev/null; draw --config "$cfg" fill-rect --x 20 --y 8 --width 24 --height 46 --color "${base[$idx]}" >/dev/null ;;
    4) draw --config "$cfg" fill-rect --x 8 --y 20 --width 48 --height 24 --color "${dark[$idx]}" >/dev/null; draw --config "$cfg" fill-circle --cx 32 --cy 32 --r 21 --color "${base[$idx]}" >/dev/null ;;
    5) draw --config "$cfg" fill-rect --x 18 --y 8 --width 28 --height 48 --color "${dark[$idx]}" >/dev/null; draw --config "$cfg" fill-circle --cx 32 --cy 32 --r 19 --color "${base[$idx]}" >/dev/null ;;
    6) draw --config "$cfg" fill-circle --cx 32 --cy 32 --r 28 --color "${dark[$idx]}" >/dev/null; draw --config "$cfg" fill-rect --x 13 --y 22 --width 38 --height 20 --color "${base[$idx]}" >/dev/null ;;
  esac
  draw --config "$cfg" line --x0 32 --y0 9 --x1 15 --y1 32 --color "${light[$idx]}" >/dev/null
  draw --config "$cfg" line --x0 15 --y0 32 --x1 32 --y1 53 --color "${light[$idx]}" >/dev/null
  draw --config "$cfg" line --x0 32 --y0 9 --x1 49 --y1 32 --color "#ffffffbb" >/dev/null
  draw --config "$cfg" line --x0 15 --y0 32 --x1 49 --y1 32 --color "#ffffff99" >/dev/null
  draw --config "$cfg" line --x0 32 --y0 9 --x1 32 --y1 53 --color "#ffffff55" >/dev/null
  if (( strain >= 1 )); then draw --config "$cfg" line --x0 20 --y0 15 --x1 32 --y1 32 --color "#180d22" >/dev/null; fi
  if (( strain >= 2 )); then draw --config "$cfg" line --x0 32 --y0 32 --x1 46 --y1 49 --color "#180d22" >/dev/null; draw --config "$cfg" line --x0 31 --y0 31 --x1 42 --y1 22 --color "#180d22" >/dev/null; fi
  if (( strain >= 3 )); then draw --config "$cfg" line --x0 12 --y0 38 --x1 32 --y1 32 --color "#fff2e0" >/dev/null; draw --config "$cfg" line --x0 32 --y0 32 --x1 53 --y1 25 --color "#fff2e0" >/dev/null; draw --config "$cfg" stroke-circle --cx 32 --cy 32 --r 29 --color "#ff5577" >/dev/null; fi
  draw --config "$cfg" render --actions "$log" --out "$file" --width 64 --height 64 --background transparent >/dev/null
}

for i in "${!kinds[@]}"; do for s in 0 1 2 3; do draw_gem "${kinds[$i]}" "$s" "$i"; done; done

# Cut overlays.
for cut in brilliant star; do
  cfg="$work/draw.json"; log="$work/actions.json"; file="$out/gems/$cut.png"
  printf '{"width":64,"height":64,"background":"transparent","actions":"%s","preview":"%s","layers":"%s"}\n' "$log" "$file" "$work/layers.json" > "$cfg"; draw --config "$cfg" init >/dev/null
  if [[ "$cut" == brilliant ]]; then
    draw --config "$cfg" stroke-circle --cx 32 --cy 32 --r 27 --color '#fff4b8' >/dev/null
    for p in '32 5 32 59' '5 32 59 32' '13 13 51 51' '51 13 13 51'; do set -- $p; draw --config "$cfg" line --x0 "$1" --y0 "$2" --x1 "$3" --y1 "$4" --color '#ffffffcc' >/dev/null; done
  else
    for p in '32 4 32 60' '4 32 60 32' '12 12 52 52' '52 12 12 52'; do set -- $p; draw --config "$cfg" line --x0 "$1" --y0 "$2" --x1 "$3" --y1 "$4" --color '#fff0aaff' >/dev/null; done
    draw --config "$cfg" fill-circle --cx 32 --cy 32 --r 5 --color '#ffffffdd' >/dev/null
  fi
  draw --config "$cfg" render --actions "$log" --out "$file" --width 64 --height 64 --background transparent >/dev/null
done

# Prism states, a clear rainbow-cut stone.
for s in 0 1 2 3; do
  cfg="$work/draw.json"; log="$work/actions.json"; file="$out/gems/prism-$s.png"
  printf '{"width":64,"height":64,"background":"transparent","actions":"%s","preview":"%s","layers":"%s"}\n' "$log" "$file" "$work/layers.json" > "$cfg"; draw --config "$cfg" init >/dev/null
  draw --config "$cfg" fill-circle --cx 32 --cy 32 --r 28 --color '#d9f8ffbb' >/dev/null
  draw --config "$cfg" fill-rect --x 18 --y 12 --width 14 --height 40 --color '#ff5d8acc' >/dev/null
  draw --config "$cfg" fill-rect --x 32 --y 12 --width 14 --height 40 --color '#62e6ffcc' >/dev/null
  draw --config "$cfg" line --x0 8 --y0 32 --x1 56 --y1 32 --color '#fff8c8' >/dev/null
  draw --config "$cfg" line --x0 32 --y0 5 --x1 32 --y1 59 --color '#ffffff' >/dev/null
  (( s > 0 )) && draw --config "$cfg" line --x0 15 --y0 17 --x1 32 --y1 32 --color '#39254f' >/dev/null
  (( s > 1 )) && draw --config "$cfg" line --x0 32 --y0 32 --x1 48 --y1 47 --color '#39254f' >/dev/null
  (( s > 2 )) && draw --config "$cfg" stroke-circle --cx 32 --cy 32 --r 29 --color '#ff5577' >/dev/null
  draw --config "$cfg" render --actions "$log" --out "$file" --width 64 --height 64 --background transparent >/dev/null
done

# Board frame (field extent plus carved corner ornaments).
cfg="$work/draw.json"; log="$work/actions.json"; file="$out/gems/board-frame.png"
printf '{"width":592,"height":592,"background":"transparent","actions":"%s","preview":"%s","layers":"%s"}\n' "$log" "$file" "$work/layers.json" > "$cfg"; draw --config "$cfg" init >/dev/null
draw --config "$cfg" stroke-rect --x 4 --y 4 --width 584 --height 584 --color '#5fe4ef' >/dev/null
draw --config "$cfg" stroke-rect --x 10 --y 10 --width 572 --height 572 --color '#174b66' >/dev/null
for xy in '18 18' '574 18' '18 574' '574 574'; do set -- $xy; draw --config "$cfg" fill-circle --cx "$1" --cy "$2" --r 9 --color '#f7d58b' >/dev/null; done
draw --config "$cfg" render --actions "$log" --out "$file" --width 592 --height 592 --background transparent >/dev/null

# Draw-sheet sequences: four real fracture frames per kind and six prism turns.
for i in "${!kinds[@]}"; do
  dir="$out/gems/break/${kinds[$i]}"; mkdir -p "$dir"; cfg="$work/sheet.json"; rm -f "$work"/frame*.json
  printf '{"width":64,"height":64,"background":"transparent","frames":[0,1,2,3],"actions":"%s/frame-{frame}.json","preview":"%s/frame-{frame}.png","layers":"%s/sheet-layers.json"}\n' "$work" "$dir" "$work" > "$cfg"
  draw-sheet --config "$cfg" init >/dev/null
  for f in 0 1 2 3; do
    r=$((25-f*5)); draw-sheet --config "$cfg" --frame "$f" fill-circle --cx $((32-f*3)) --cy $((32-f*2)) --r "$r" --color "${base[$i]}" >/dev/null
    draw-sheet --config "$cfg" --frame "$f" line --x0 $((10+f*2)) --y0 $((28-f*3)) --x1 $((52-f*2)) --y1 $((35+f*3)) --color '#ffffffcc' >/dev/null
    draw-sheet --config "$cfg" --frame "$f" fill-circle --cx $((47+f*3)) --cy $((25-f*3)) --r $((4+f)) --color "${light[$i]}" >/dev/null
    draw-sheet --config "$cfg" --frame "$f" fill-circle --cx $((18-f*3)) --cy $((43+f*2)) --r $((3+f)) --color "${dark[$i]}" >/dev/null
  done
  for f in 0 1 2 3; do draw-sheet --config "$cfg" render --actions "$work/frame-$f.json" --out "$dir/frame-$f.png" --width 64 --height 64 --background transparent >/dev/null; done
done

dir="$out/gems/prism-turn"; mkdir -p "$dir"; cfg="$work/sheet.json"; rm -f "$work"/prism*.json
printf '{"width":64,"height":64,"background":"transparent","frames":[0,1,2,3,4,5],"actions":"%s/prism-{frame}.json","preview":"%s/frame-{frame}.png","layers":"%s/prism-layers.json"}\n' "$work" "$dir" "$work" > "$cfg"; draw-sheet --config "$cfg" init >/dev/null
for f in 0 1 2 3 4 5; do w=$((8 + (f<3?f:6-f)*6)); x=$(((64-w)/2)); draw-sheet --config "$cfg" --frame "$f" fill-rect --x "$x" --y 7 --width "$w" --height 50 --color '#a9f7ffff' >/dev/null; draw-sheet --config "$cfg" --frame "$f" line --x0 32 --y0 7 --x1 "$x" --y1 32 --color '#ff6fa8' >/dev/null; draw-sheet --config "$cfg" --frame "$f" line --x0 32 --y0 57 --x1 $((x+w)) --y1 32 --color '#ffe26f' >/dev/null; done
for f in 0 1 2 3 4 5; do draw-sheet --config "$cfg" render --actions "$work/prism-$f.json" --out "$dir/frame-$f.png" --width 64 --height 64 --background transparent >/dev/null; done

# Particle assets.
for fx in clear-burst flawed-detonation cut-flash cut-aura; do
  cfg="$work/particle.json"; log="$work/particle.log.json"; sys="$out/fx/$fx.system.json"
  loop=false; rate=''; burst=18; life=420; speed=75; color='#62e6ff@0,#fff3a0@0.45,#ff5d8a@1'
  [[ "$fx" == flawed-detonation ]] && { burst=38; life=650; speed=135; color='#ffffff@0,#ff426d@0.35,#551233@1'; }
  [[ "$fx" == cut-flash ]] && { burst=26; life=520; speed=95; color='#ffffff@0,#ffe36d@0.5,#64eaff@1'; }
  [[ "$fx" == cut-aura ]] && { loop=true; burst=''; rate=7; life=850; speed=22; color='#ffffff@0,#69eeff@0.5,#ffd66b@1'; }
  printf '{"width":128,"height":128,"duration_ms":1200,"fps":30,"seed":42,"log":"%s","preview":"%s/%s.gif","system":"%s"}\n' "$log" "$work" "$fx" "$sys" > "$cfg"
  particle-2d --config "$cfg" init >/dev/null
  args=(--name sparks --shape cone --x 64 --y 64 --radius 3 --lifetime "$life" --lifetime-spread 120 --speed "$speed" --speed-spread 35 --dir-x 0 --dir-y 1 --cone-angle 180 --seed 17)
  [[ -n "$burst" ]] && args+=(--burst "$burst") || args+=(--rate "$rate")
  particle-2d --config "$cfg" add-emitter "${args[@]}" >/dev/null
  particle-2d --config "$cfg" set-particle --emitter sparks --size-curve ease-out --size-from 1.8 --size-to 0.15 --opacity-curve ease-in --opacity-from 1 --opacity-to 0 --color-gradient "$color" --rotation 150 --stretch 1.8 >/dev/null
  particle-2d --config "$cfg" set-forces --gravity 18 --gravity-dir '0,-1' --drag 0.8 >/dev/null
  particle-2d --config "$cfg" set-timeline --loop "$loop" >/dev/null
  particle-2d --config "$cfg" render >/dev/null
done

# Synthesized cues and an ascending eight-tone chain ladder.
make_sfx() {
  local name="$1" wave="$2" freq="$3" to="$4" dur="$5" env="$6"
  local cfg="$work/sfx.json"
  printf '{"sample_rate":44100,"channels":"stereo","max_duration_ms":1200,"seed":91,"log":"%s/sfx.log.json","preview":"%s/%s.png","wav":"%s/audio/%s.wav"}\n' "$work" "$work" "$name" "$out" "$name" > "$cfg"
  sfx-synth --config "$cfg" init >/dev/null
  sfx-synth --config "$cfg" add-voice --name tone --wave "$wave" --freq "$freq" --gain -8 --dur "$dur" >/dev/null
  sfx-synth --config "$cfg" set-envelope --voice tone --env "$env" >/dev/null
  sfx-synth --config "$cfg" set-pitch --voice tone --slide-to "$to" --over "$dur" >/dev/null
  sfx-synth --config "$cfg" add-voice --name air --wave noise --gain -22 --dur "$dur" >/dev/null
  sfx-synth --config "$cfg" set-envelope --voice air --env pluck >/dev/null
  sfx-synth --config "$cfg" render >/dev/null
}
make_sfx select triangle 680 920 90 pluck
make_sfx swap sine 330 620 150 punch
make_sfx refuse square 170 115 140 gate
make_sfx land sine 105 62 240 punch
make_sfx flaw noise 440 440 260 punch
make_sfx cut triangle 920 1520 340 pluck
make_sfx levelup triangle 440 1320 700 swell
make_sfx gameover sine 520 95 900 swell
for i in 1 2 3 4 5 6 7 8; do f=$((380+i*70)); make_sfx "chain-$i" triangle "$f" $((f+90)) 170 pluck; done

# Sampled shatter body.
cfg="$work/sample.json"; printf '{"sample_rate":44100,"channels":"stereo","max_duration_ms":1200,"seed":51,"sample_pack":"combat-core","log":"%s/sample.log.json","preview":"%s/shatter.png","wav":"%s/audio/shatter.wav"}\n' "$work" "$work" "$out" > "$cfg"
sfx-sample --config "$cfg" init >/dev/null
sfx-sample --config "$cfg" add-sample --name debris_glass --t 0 --gain -2 --pitch 3 --fade-out 180 >/dev/null
sfx-sample --config "$cfg" add-sample --name snap_transient --t 0 --gain -7 --pitch 5 >/dev/null
sfx-sample --config "$cfg" render >/dev/null

# Two authored music pieces with score and ready-to-play WAV.
make_music() {
  local name="$1" tempo="$2" rootnote="$3" cfg="$work/music.json"
  printf '{"sample_rate":44100,"channels":"stereo","max_duration_ms":18000,"seed":33,"instrument_bank":"gm-lite","log":"%s/music.log.json","preview":"%s/%s-roll.png","wav":"%s/audio/%s.wav","mid":"%s/audio/%s.mid"}\n' "$work" "$work" "$name" "$out" "$name" "$out" "$name" > "$cfg"
  music --config "$cfg" init >/dev/null; music --config "$cfg" set-tempo --bpm "$tempo" >/dev/null; music --config "$cfg" set-time-signature --num 4 --den 4 >/dev/null
  music --config "$cfg" define-track --name lead --instrument music_box >/dev/null; music --config "$cfg" define-track --name bed --instrument vibraphone >/dev/null; music --config "$cfg" define-track --name pulse --instrument marimba >/dev/null
  notes=("$rootnote" E5 G5 B5 A5 G5 E5 D5); bass=(C3 C3 A2 A2 F2 G2 C3 G2)
  for i in 0 1 2 3 4 5 6 7; do music --config "$cfg" add-note --track lead --pitch "${notes[$i]}" --t "$i" --dur 0.75 --velocity 82 >/dev/null; music --config "$cfg" add-note --track bed --pitch "${bass[$i]}" --t "$i" --dur 1 --velocity 56 >/dev/null; music --config "$cfg" add-note --track pulse --pitch "${bass[$i]}" --t "$i" --dur 0.35 --velocity 48 >/dev/null; done
  music --config "$cfg" set-track-fx --track lead --gain -5 --pan 0.18 --reverb 0.35 --env pluck >/dev/null; music --config "$cfg" set-track-fx --track bed --gain -10 --pan -0.16 --reverb 0.5 --env swell >/dev/null
  music --config "$cfg" render >/dev/null
}
make_music title-theme 112 C5
make_music play-bed 86 G4

echo "Generated Facet production assets in $out"
