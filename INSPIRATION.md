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
| Reaction-diffusion | grayscott, turing, fitzhughnagumo | Brusselator, multi-species variants |
| Strange attractors | lorenz, clifford | Rössler, Thomas, Dadras, Sprott systems |
| Fractals | mandelbrot, julia, sierpinski, lsystem, newton, buddhabrot | burning ship, iterated function systems |
| Physics | pendulum, springwires, boids, montecarlo | N-body gravity, soft-body, fluid, elastic lattices |
| Noise and flow | flow, scandrift, colorrivers | curl noise, domain warping, spectral synthesis |
| Geometry and tiling | truchet, voronoi, chinoiserie | Penrose, Wang tiles, hat monotile, hyperbolic tilings |
| Generative drawing | molnar, schotter, nake, noll | Mohr hypercubes, more Molnár systems, plotter constraints |
| Pattern and texture | halftone, chladni, phyllotaxis, moire | interference lattices, texture synthesis |
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

---

## Pathway: Scientific phenomena as entry points

Most of the gallery starts from the algorithm and derives the image. This pathway inverts that. Start from a real physical phenomenon that has already been visualized scientifically — a phenomenon that humans can recognize on sight — and then trace back to the simulation or mathematical model underneath it.

The selection test: could a non-programmer look at this and say "I've seen that in nature"? If yes, and if the model is tractable in a browser, it belongs here.

### Fluid and wave dynamics
- **Navier-Stokes fluid simulation** — incompressible flow; Jos Stam's stable fluids paper (1999) is the canonical browser-safe implementation. Smoke, ink in water, thermal plumes.
- **Shallow water equations** — 2D wave propagation; ripples from a dropped stone, interference from two sources, shoaling near a boundary. Jos Stam again; also Matthias Müller (2010).
- **Kelvin-Helmholtz instability** — the rolling vortices that appear when two fluids move at different speeds; visible in cloud formations and Jupiter's bands. A 2D Euler solver with a velocity shear produces it cleanly.
- **Rayleigh-Bénard convection** — heat-driven circulation cells; the honeycomb patterns in heated oil. Lattice-Boltzmann methods work well in-browser.
- **Acoustic resonance / Chladni figures** — already in the gallery (chladni), but cymatics extensions (3D surface modes, Faraday waves) are open.

### Biological and ecological dynamics
- **SIR epidemic models** — compartmental differential equations for infection spread; show R₀ above and below 1, herd immunity threshold, wave shapes. Referenced constantly post-2020; well-grounded academically.
- **Turing morphogenesis** — already have turing in the gallery. Adjacent: Gierer-Meinhardt activator-inhibitor (spots vs stripes selection), and Kondo-Asai fish skin models from the 1995 paper.
- **Predator-prey (Lotka-Volterra)** — population oscillations on a phase plane; the rabbit-fox cycle. The phase portrait is the interesting visualization, not the time series.
- **Eden growth model** — cells attach to the boundary of a cluster at random. Produces rough, organic-looking colony edges. Related to DLA but biologically motivated.
- **Schelling segregation model** — Thomas Schelling's 1971 paper showing that mild individual preference for similar neighbors produces strong macro-level segregation. Grid-based; simple to implement; historically significant.

### Electromagnetic and optical phenomena
- **Electric field lines and equipotentials** — place charges on a canvas and trace gradient lines. The field geometry changes dramatically as charges move.
- **Interference and diffraction patterns** — double-slit experiment rendered as a 2D wavefield; show how slit width, separation, and wavelength shift the fringe pattern. Connects directly to Fourier optics.
- **Lissajous curves and oscilloscope art** — two sinusoids on perpendicular axes; the ratio of frequencies determines the shape. Classic visualization of phase relationships.
- **Magnetic field of current loops** — Biot-Savart law numerically integrated; helmholtz coils, solenoids, magnetic dipoles. Connects to how MRI machines work.

### Geophysical and astronomical
- **N-body gravity** — already have montecarlo adjacent to this; direct N-body is open. Show orbit emergence, the three-body problem's chaos, Lagrange points.
- **Orbital mechanics / Kepler ellipses** — animate conic sections from the vis-viva equation; show how eccentricity, semimajor axis, and true anomaly relate.
- **Perlin/simplex noise as terrain** — noise is in the gallery (scandrift, colorrivers); heightmap-based terrain with erosion simulation is open. Show hydraulic erosion carving valleys over time.
- **Tidal forcing and resonance** — standing wave nodes in a rectangular basin; why the Bay of Fundy has 16-meter tides. The resonance frequency matches the forcing frequency.

### Materials and statistical physics
- **Ising model** — lattice of spins, each flipping based on neighbor agreement and temperature. Below the critical temperature, large ferromagnetic domains form. The phase transition is the visual payoff.
- **Percolation theory** — fill a grid randomly and ask when a connected path spans the lattice. Right at the threshold, fractal cluster structure appears. Visually striking and theoretically deep.
- **Random walk / Brownian motion** — already have DLA which uses this; the 2D path ensemble and its statistical properties (MSD, return probability) are open.
- **Crystal growth / Snowflake simulation** — Reiter's cellular automaton (1992) for dendritic ice growth. Six-fold symmetry emerges from local rules and diffusion-limited attachment.

### Reference sources for this pathway
- Jos Stam, *Stable Fluids* (1999): <https://www.dgp.toronto.edu/public_user/stam/reality/Research/pdf/ns.pdf>
- Philip Ball, *The Self-Made Tapestry: Pattern Formation in Nature* (1999)
- Complexity Explorables (SIR, Schelling, Ising): <https://www.complexity-explorables.org>
- Kondo and Asai, *A reaction-diffusion wave on the skin of the marine angelfish* (1995): *Nature* 376, 765–768
- Thomas Schelling, *Dynamic Models of Segregation* (1971): *Journal of Mathematical Sociology* 1(2), 143–186

---

## Foundational infrastructure algorithms — visualization pool

These are algorithms and mathematical formulations chronicled as key steps in the development of digital infrastructure. Good for staying fresh and avoiding drift back toward pure mathematical art.

Each entry has a brief note on what makes it worth building visually.

### Signal and information theory

- **Fast Fourier Transform (FFT)** — Cooley-Tukey, 1965. O(N log N) divide-and-conquer decomposition of signals. Foundational for audio, imaging, compression, GPS. Show the butterfly diagram; animate frequency bins building up from a waveform. Historically traces to Gauss (1800s). Source: *Computing in Science & Engineering* top 10, 2000.
- **Huffman coding** — 1952. Optimal prefix-free compression. Build a binary tree from symbol frequencies; visualize the tree growing and the code lengths shrinking for common symbols. Every ZIP and JPEG uses it.
- **Shannon entropy** — 1948. The mathematical measure of information. Visualize uncertainty collapse as bits arrive; show entropy curves for different distributions. Connects to error correction and channel capacity.
- **Reed-Solomon / Hamming error correction** — 1950s–60s. Error-correcting codes that let CDs, satellites, and QR codes recover from damage. Visualize the redundancy geometry: codewords as points in space that stay far apart so errors can be detected and corrected.

### Cryptographic primitives

- **Diffie-Hellman key exchange** — 1976. Two parties derive a shared secret over a public channel using modular exponentiation. The color-mixing analogy (public colors combined with private colors) is classic and highly buildable.
- **RSA** — Rivest, Shamir, Adleman, 1977. Public-key cryptography from prime factorization hardness. Visualize modular arithmetic, key generation from prime pairs, and the asymmetry between encrypting and factoring.
- **Elliptic curve cryptography (ECC)** — 1985, Miller and Koblitz. Smaller keys, same security as RSA. The point addition geometry on a curve is visually distinctive and rarely shown interactively.
- **SHA-256 / Merkle-Damgård construction** — shows how any message is compressed into a fixed-length digest through iterated block operations. The avalanche effect (one bit change cascades) is a strong visual hook.

### Routing and network topology

- **Dijkstra's shortest path** — 1956. Greedy relaxation through a weighted graph. Animate the frontier expanding, edge weights lighting up, paths locking in. Used in GPS, OSPF, game AI. Already common but worth doing well.
- **A\* search** — 1968. Dijkstra with a heuristic to focus the frontier. Show the difference: A\* ignores large areas Dijkstra would explore. The heuristic cone is visually clear.
- **TCP congestion control / AIMD** — Jacobson, 1988. Additive increase, multiplicative decrease. The sawtooth window-size graph over time is iconic. Show a live simulation of packets, losses, and the window adapting.
- **BGP path-vector routing** — 1989–94. How autonomous systems (ISPs, data centers) advertise reachability to each other. Visualize AS graphs, route propagation, and what happens when a route is withdrawn (the cascade).
- **PageRank** — Brin and Page, 1998. Random walk on a directed graph; rank = probability of landing on a node. Show the power iteration converging; visualize which nodes accumulate probability mass.

### Sorting and search

- **Quicksort** — Hoare, 1961. Pivot selection and partition; average O(N log N), worst case O(N²). The partition step visualized in-place is satisfying. Compare pivot strategies (random, median-of-three).
- **Merge sort / von Neumann** — 1945. Divide-and-conquer stable sort. The merge step visualized as two sorted streams interleaving is clean and historically important.
- **Hash tables with open addressing / chaining** — 1950s onward. Show collisions, load factor effects, and rehashing. Fundamental to nearly every runtime in existence.
- **B-trees** — 1970, Bayer and McCreight. Self-balancing tree structures for disk storage. Every database index is a B-tree or B+ tree. Animate insertion, splits, and height balance.

### Optimization and learning

- **Gradient descent** — 1847, Cauchy; modern ML form from Rumelhart, Hinton, Williams, 1986. Show the loss landscape and the ball rolling downhill. Visualize learning rate effects, saddle points, local minima.
- **Backpropagation** — 1986. The chain rule applied backward through a computation graph. Animate the forward pass (values) and backward pass (gradients) on a small network.
- **Simplex method** — Dantzig, 1947. Linear programming: traverse vertices of a polytope toward the optimum. Visualize the feasible region as a polygon; show the algorithm hopping along edges.
- **Monte Carlo methods** — Metropolis and Ulam, 1940s. Random sampling to approximate deterministic answers. Pi estimation is the classic entry point; extend to importance sampling and MCMC chains.

### Geometry and spatial indexing

- **Convex hull algorithms** — Graham scan (1972), Jarvis march, QuickHull. The boundary wrapping process is visually strong. Used in collision detection, GIS, robotics.
- **KD-trees and spatial partitioning** — 1975, Bentley. Recursive axis-aligned splitting for fast nearest-neighbor queries. Animate the tree building and a query narrowing down through cells.
- **Delaunay triangulation / Voronoi duality** — Delaunay 1934. The circumcircle condition; its dual is the Voronoi diagram. Show the flip algorithm and how circumcircles guide it.

### Reference

- *Top 10 Algorithms of the 20th Century* — Computing in Science & Engineering, 2000: <http://amath.colorado.edu/faculty/martinss/Teaching/APPM5720_2016s/top10_algorithms.pdf>
- INFORMS: *Algorithms That Changed The World*: <https://www.informs.org/Publications/OR-MS-Tomorrow/Algorithms-That-Changed-The-World>
- Cloudflare BGP explainer: <https://www.cloudflare.com/learning/security/glossary/what-is-bgp/>
