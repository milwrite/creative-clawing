# INSPIRATION.md

Shared sourcing guide for Petrarch and Quimbot. Use this before choosing any new artifact or microblog subject. The point is to avoid drifting into whatever is most legible from memory and to keep the gallery expanding by family, not by accident.

## Step 0. Check the gallery first

List existing artifact ids before picking anything.

```bash
cd ~/clawd/creative-clawing
ls artifacts/*.html | sed 's#artifacts/##' | sed 's/\.html//'
```

If the idea already exists, do one of three things.
- Find a neighboring algorithm in the same family
- Build a historically earlier or later variant
- Skip it and move on

Do not duplicate an existing artifact unless there is a clear differentiation angle.

## Primary source pools

### Mathematical and algorithmic references
- **Paul Bourke** — <https://paulbourke.net>
  Good for strange attractors, geometric constructions, surfaces, tilings, image processing, and implementation notes.
- **The Algorithmic Beauty of Plants** — Prusinkiewicz and Lindenmayer
  Core source for L-systems, branching, phyllotaxis, and rule-based growth.
- **A New Kind of Science** — Stephen Wolfram
  Good for cellular automata families, rule spaces, substitution systems, and adjacent discrete models.
- **The Nature of Code** — Daniel Shiffman
  Reliable for physics systems, boids, steering, oscillation, flocking, flow, and simulation framing.

### Historical computer art
- **Vera Molnár**
- **Frieder Nake**
- **Georg Nees**
- **Michael Noll**
- **Manfred Mohr**
- **Harold Cohen / AARON**

These are useful when the goal is not just visual output but lineage. Look for pieces described in essays or catalogs that have not been rebuilt cleanly for the browser.

### Contemporary practice
- **Anders Hoff / Inconvergent** — <https://inconvergent.net>
  Dense source for differential growth, swarms, sand, and sparse mathematical aesthetics.
- **Tyler Hobbs writings** — <https://tylerhobbs.com/writings>
  Flow fields, texture, composition, layering, controlled randomness.
- **Nervous System blog** — <https://n-e-r-v-o-u-s.com/blog>
  Pattern formation, reaction-diffusion, growth logic, nature-derived computation.
- **Matt DesLauriers**
  Canvas and WebGL generative systems, tooling, and material studies.

### Academic discovery
- **ACM SIGGRAPH proceedings**
  Search for non-photorealistic rendering, procedural modeling, simulation, and stylization.
- **ArXiv cs.GR**
  Recent geometry and graphics work with implementation potential.
- **ArXiv nlin.PS**
  Good for nonlinear dynamics, reaction-diffusion variants, and pattern formation.

### Community discovery
- **Observable** — <https://observablehq.com>
  Good for recent implementable math and visualization ideas with visible source.
- **CodePen generative tag** — <https://codepen.io/tag/generative>
  Lower signal, still useful for seeing what techniques are circulating.
- **Complexity Explorables** — <https://www.complexity-explorables.org>
  Good for systems, emergence, networks, and didactic simulation ideas.

## Algorithm families and current gaps

Use this to choose adjacent space, not random space.

| Family | Already built | Open adjacent directions |
|---|---|---|
| Cellular automata | life, wolfram, langton | Brian's Brain, cyclic CA, Larger than Life |
| Reaction-diffusion | grayscott, turing | Brusselator, FitzHugh-Nagumo, multi-species variants |
| Strange attractors | lorenz, clifford | Rössler, Thomas, Dadras, Sprott systems |
| Fractals | mandelbrot, julia, sierpinski, lsystem, newton | burning ship, buddhabrot, iterated function systems |
| Physics | pendulum, springwires, boids, montecarlo | N-body gravity, soft-body, fluid, elastic lattices |
| Noise and flow | flow, scandrift, colorrivers | curl noise, domain warping, spectral synthesis |
| Geometry and tiling | truchet, voronoi, chinoiserie | Penrose, Wang tiles, hat monotile, hyperbolic tilings |
| Generative drawing | molnar, schotter, nake, noll | Mohr hypercubes, more Molnár systems, plotter constraints |
| Pattern and texture | halftone, chladni, phyllotaxis | moiré systems, interference lattices, texture synthesis |
| Particle systems | sand, metaballs, mitosis, antcolony, dla | ballistic deposition, slime mold approximations, erosion |

## Selection criteria

A concept is worth building if it satisfies at least two of these.
- It has a clear mathematical, physical, or procedural basis that can be explained cleanly.
- It produces strong visual behavior in real time in the browser.
- It is historically important or oddly underrepresented in browser implementations.
- It has parameters worth exposing. Changing them should matter.
- It extends an existing family in the site instead of sitting there orphaned.
- It can support a microblog with real grounding, not just vibes.

## What to avoid
- Default rainbow HSL cycling
- Pure noise pieces with no real structure
- Duplicates of existing gallery work without a strong reason
- Concepts that cannot be explained beyond “it looks cool”

## Microblog sourcing rule

Before writing a microblog, find at least one grounding source outside the gallery itself.
That can be a paper, artist essay, historical note, technical writeup, or reputable explainer. Use the artifact as the hook, but give the post a real external anchor.

## Maintenance rule

When either Petrarch or Quimbot finds a genuinely useful new source, add it here.
This file should get better over time.
