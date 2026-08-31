# Design System — ReClaim

<!-- impeccable:design-schema 1 -->

## World
Hardware store receipt + thermal scanner. Light workshop daylight, warm thermal paper (#FFFBF0) on kraft, scanner red (#FF3B30) as active, verified teal (#0E7C6B) for success, rule hairlines (#E8E0C9). Paper fiber texture, perforated edges, ink stamp, stud-grid alignment for exploded steps. Not SaaS dark, not generic cream-serif.

## Palette
- paper: #FFFBF0 (ground)
- paperDeep: #FFF4D6
- kraft: #C9A98A / #8A6B4E
- ink: #0F0F0E / muted #3A3A38
- scanner: #FF3B30 / dark #CC2F26
- verified: #0E7C6B on #E6F4F1
- rule: #E8E0C9 / dark #D4C9A8
- caution: #FFB800 (selection, highlight)

## Type
- Display: Geist (600) for headlines, tight tracking -0.035em, measure 65-75ch
- Mono: Geist Mono for receipts, SKUs, hashes, CIDs (labels uppercase 11px, tracking 0.08em)
- Scale: hero 42/54/64, section 28/32, receipt 13/11, never gradient text.

## Materials & Components
- Receipt card: white, rule border, shadow receipt (18px blur offset + soft), perforation radial strip, thermal-fade mask.
- Scanner window: ink black ground, corner brackets (viewfinder, 2px white/85), laser 2px scanner red with glow, confidence pill white.
- Controls: trigger rounded-full, scanner red with shadow-scanner; secondary ink or kraft; focus-ring 2px scanner offset.
- Pegboard chips: varied size, border tint per material, mono 12px.
- Exploded steps: stud-grid 16px, numbered circles (scanner/ink/verified), dashed arrows.

## Motion
- One authored moment: scan sweep (1.6s linear) + receipt print (520ms cubic-bezier 0.16,1,0.3,1) + stamp pop (420ms). No scattered hovers. Exponential ease-out from visible default. Paper prints from masked container.
- Reduced-motion disables scan/print, keeps instant state swaps.

## Layout & Topology
- Max 1160px, paper fiber ground. Dense but airy: tight groups, generous separation, more space above headings.
- Hero split 1.06/0.92, gun overlaps receipt (-top offset), scanner window inset.
- Mechanism: 2-col (text + stud-grid diagram), barcode lattice full-width later.
- Responsive: hero stacks, scanner on top on mobile, receipt below; module mosaic reflows, corners stay.

## Accessibility
- Contrast body ≥4.5:1, large ≥3:1. No gray on colored surfaces. Keyboard focus scanner red, all controls reachable, camera needs HTTPS, file fallback, error alerts role=alert, reduced-motion respected.

## Iconography
- Inline SVG, 1.4-1.6 stroke, consistent weight. No emoji. Scanner gun authored SVG, barcode columns procedural.

## Voice
Precise, physical, optimistic. Controls name action (Pull trigger — Scan), errors name problem + recovery (Below 85 — retake sharper).

