---
version: alpha
name: "Stripe HDS Light"
description: "Stripe's design system is a polished, brand-forward financial infrastructure platform built on a single variable-weight typeface (sohne-var) and a deep indigo/violet primary palette. The hero features a signature multi-color gradient mesh (indigo, orange, pink, teal) against a white surface, with large light-weight headings and a subdued blue secondary text color. Navigation is compact with transparent background, two distinct CTA buttons (outlined \"Aanmelden\" and solid indigo \"Contact opnemen met sales\"), and a trusted-brand logo strip. Components use a consistently tight 4–6px border radius, subtle card shadows, and an 8px-base spacing grid."
colors:
  brand-violet-light: "#7f7dfc"
  quiet-surface: "#f8fafd"
  surface-white: "#ffffff"
  accent-orange: "#ff6118"
  brand-indigo: "#533afd"
  deep-navy: "#061b31"
  slate-body: "#50617a"
  subdued-heading: "#64748d"
  text-on-solid: "#ffffff"
  border-neutral: "#e5edf5"
typography:
  hero-heading:
    fontFamily: "sohne-var"
    fontSize: "44px"
    fontWeight: "300"
    lineHeight: "1.03"
  section-heading-xl:
    fontFamily: "sohne-var"
    fontSize: "26px"
    fontWeight: "300"
    lineHeight: "29.12px"
    letterSpacing: "-0.26px"
  section-heading-md:
    fontFamily: "sohne-var"
    fontSize: "22px"
    fontWeight: "300"
    lineHeight: "24.2px"
    letterSpacing: "-0.22px"
  body-regular:
    fontFamily: "sohne-var"
    fontSize: "16px"
    fontWeight: "400"
    lineHeight: "22.4px"
  body-light:
    fontFamily: "sohne-var"
    fontSize: "16px"
    fontWeight: "300"
    lineHeight: "22.4px"
  label-small:
    fontFamily: "sohne-var"
    fontSize: "14px"
    fontWeight: "400"
    lineHeight: "14px"
  caption:
    fontFamily: "sohne-var"
    fontSize: "11px"
    fontWeight: "300"
    lineHeight: "15.95px"
  micro-label:
    fontFamily: "sohne-var"
    fontSize: "10px"
    fontWeight: "400"
    lineHeight: "14.5px"
    letterSpacing: "0.1px"
rounded:
  radius-none: "0px"
  radius-xs: "1px"
  radius-sm: "4px"
  radius-md: "6px"
  radius-lg: "8px"
  radius-xl: "16px"
spacing:
  space-1: "2px"
  space-2: "4px"
  space-3: "6px"
  space-4: "8px"
  space-5: "10px"
  space-6: "12px"
  space-7: "16px"
  space-8: "20px"
  space-9: "24px"
  space-10: "32px"
  space-11: "40px"
  space-12: "44px"
  space-13: "64px"
  space-14: "96px"
---

## Overview

Stripe's design system is a polished, brand-forward financial infrastructure platform built on a single variable-weight typeface (sohne-var) and a deep indigo/violet primary palette. The hero features a signature multi-color gradient mesh (indigo, orange, pink, teal) against a white surface, with large light-weight headings and a subdued blue secondary text color. Navigation is compact with transparent background, two distinct CTA buttons (outlined "Aanmelden" and solid indigo "Contact opnemen met sales"), and a trusted-brand logo strip. Components use a consistently tight 4–6px border radius, subtle card shadows, and an 8px-base spacing grid.

**Signature traits:**
- Single-family weight hierarchy: Builds hierarchy from sohne-var across 2 weights rather than multiple families.
- Layered elevation: Depth comes from 5 validated shadow tokens.

## Colors

The palette uses 10 validated color tokens across 1 theme profile. Semantic roles stay attached to observed usage so generation agents can choose accents without inventing new color meaning.

**Semantic naming:**
- **action-text** maps to `brand-indigo`: Role "text" is grounded by usage context "Primary CTA button fill, links, accent borders, charm backgrounds".
- **content-text** maps to `deep-navy`: Role "text" is grounded by usage context "Primary heading text, solid text, hero title".
- **surface-background** maps to `surface-white`: Role "background" is grounded by usage context "Page background, card surfaces, input backgrounds".
- **surface-border** maps to `border-neutral`: Role "border" is grounded by usage context "Dividers, surface borders, quiet strokes".

### Text Scale
- **Accent Orange** (#ff6118): Orange accent in gradient hero, accent icon color. Role: text. {authored: rgb(255, 97, 24), space: rgb}
- **Brand Indigo** (#533afd): Primary CTA button fill, links, accent borders, charm backgrounds. Role: text. {authored: rgb(83, 58, 253), space: rgb}
- **Deep Navy** (#061b31): Primary heading text, solid text, hero title. Role: text. {authored: rgb(6, 27, 49), space: rgb}
- **Slate Body** (#50617a): Body text, soft navigation labels, secondary text. Role: text. {authored: rgb(80, 97, 122), space: rgb}
- **Subdued Heading** (#64748d): Subdued headings, icon subdued, secondary label text. Role: text. {authored: rgb(100, 116, 141), space: rgb}
- **Text on Solid** (#ffffff): Text on solid/filled primary buttons. Role: text. {authored: rgb(255, 255, 255), space: rgb, alpha: 0}

### Interactive
- **Border Neutral** (#e5edf5): Dividers, surface borders, quiet strokes. Role: border. {authored: rgb(229, 237, 245), space: rgb}

### Surface & Shadows
- **Brand Violet Light** (#7f7dfc): Lighter brand violet, selector active backgrounds, gradient accents. Role: background. {authored: rgb(127, 125, 252), space: rgb}
- **Quiet Surface** (#f8fafd): Quiet background sections, subtle surface fills. Role: background. {authored: rgb(248, 250, 253), space: rgb, alpha: 0.45}
- **Surface White** (#ffffff): Page background, card surfaces, input backgrounds. Role: background. {authored: rgb(255, 255, 255), space: rgb, alpha: 0}

## Typography

Typography uses sohne-var across extracted hierarchy roles. Keep hierarchy mapped to these token rows before adding decorative type styles.

Uses sohne-var throughout for a uniform feel. Weight range spans light, regular. Sizes range from 10px to 44px.

### Font Roles
- **Headline Font**: sohne-var
- **Body Font**: sohne-var

### Type Scale Evidence
| Role | Font | Size | Weight | Line Height | Letter Spacing | Stack / Features | Notes |
|------|------|------|--------|-------------|----------------|------------------|-------|
| Hero H1 title — large, light-weight, deep navy | sohne-var | 44px | 300 | 1.03 | normal | sohne-var, SF Pro Display, sans-serif; features: "ss01" | Extracted token |
| Section-level headings, large subheadings | sohne-var | 26px | 300 | 29.12px | -0.26px | sohne-var, SF Pro Display, sans-serif; features: "ss01" | Extracted token |
| Mid-level section headings | sohne-var | 22px | 300 | 24.2px | -0.22px | sohne-var, SF Pro Display, sans-serif; features: "ss01" | Extracted token |
| Primary body text, navigation labels, general content | sohne-var | 16px | 400 | 22.4px | normal | sohne-var, SF Pro Display, sans-serif; features: "ss01" | Extracted token |
| Light-weight body text, descriptive paragraphs | sohne-var | 16px | 300 | 22.4px | normal | sohne-var, SF Pro Display, sans-serif; features: "ss01" | Extracted token |
| Button labels, small UI labels, nav items | sohne-var | 14px | 400 | 14px | normal | sohne-var, SF Pro Display, sans-serif; features: "ss01" | Extracted token |
| Captions, footnotes, micro-labels | sohne-var | 11px | 300 | 15.95px | normal | sohne-var, SF Pro Display, sans-serif; features: "ss01" | Extracted token |
| Micro UI labels, badge text, data annotations | sohne-var | 10px | 400 | 14.5px | 0.1px | sohne-var, SF Pro Display, sans-serif; features: "ss01" | Extracted token |

## Layout

Layout rhythm is inferred from spacing tokens and responsive breakpoint evidence.

This system uses a 8px base grid with scale values 2, 4, 6, 8, 10, 12, 16, 20, 24, 32, 40, 44, 64, 96, 152, 160.

### Spacing System
| Token | Value | Px | Notes |
|------|-------|----|-------|
| space-1 | 2px | 2 | Extracted spacing token |
| space-2 | 4px | 4 | Extracted spacing token |
| space-3 | 6px | 6 | Extracted spacing token |
| space-4 | 8px | 8 | Extracted spacing token |
| space-5 | 10px | 10 | Extracted spacing token |
| space-6 | 12px | 12 | Extracted spacing token |
| space-7 | 16px | 16 | Mapped to --hds-space-input-text-paddingX-lg |
| space-8 | 20px | 20 | Mapped to --hds-space-core-250 |
| space-9 | 24px | 24 | Mapped to --hds-space-core-300 |
| space-10 | 32px | 32 | Extracted spacing token |
| space-11 | 40px | 40 | Extracted spacing token |
| space-12 | 44px | 44 | Mapped to --hds-space-core-550 |
| space-13 | 64px | 64 | Extracted spacing token |
| space-14 | 96px | 96 | Extracted spacing token |

## Elevation & Depth

Keep depth flat unless validated shadow or interaction evidence appears in the extraction payload. Do not invent shadows beyond this evidence boundary.

### Shadow Evidence
| Shadow Token | Layers | Details |
|--------------|--------|---------|
| shadow-sm-bottom | 1 | 0px 2px 5px 0px rgba(0, 0, 0, 0.1) |
| shadow-md-card | 1 | 0px 3px 6px 0px rgba(23, 23, 23, 0.06) |
| shadow-lg-card | 1 | 0px 15px 35px 0px rgba(23, 23, 23, 0.08) |
| shadow-xl-popover | 1 | 0px 16px 32px 0px rgba(50, 50, 93, 0.12) |
| shadow-hero-float | 1 | 0px 20.187px 40.374px -20.187px rgba(0, 0, 0, 0.1) |

### Interaction Signals
| Theme | Signal | Evidence |
|-------|--------|----------|
| Light | backdrop-filter | blur(12px) |
| Light | outline-style | solid |
| Light | outline-color | rgb(0, 0, 0) ; rgb(83, 58, 253) ; rgb(6, 27, 49) |
| Light | outline-width | 3px ; 1px |
| Light | outline-offset | 0px ; -1px |
| Light | transform | matrix(1, 0, 0, 1, 0, 0) ; matrix(1, 0, 0, 0, 0, 0) ; matrix(1, 0, 0, 1, 0, -0.48) |

## Shapes

Shape language maps directly to rounded tokens. Keep component corners consistent with the role mapping below before introducing bespoke geometry.

### Radius Roles
| Token | Value | Px | Role Mapping |
|------|-------|----|--------------|
| radius-none | 0px | 0 | Hairline corner |
| radius-xs | 1px | 1 | Hairline corner |
| radius-sm | 4px | 4 | Subtle corner |
| radius-md | 6px | 6 | Subtle corner |
| radius-lg | 8px | 8 | Control corner |
| radius-xl | 16px | 16 | Card corner |

### Geometry Evidence
| Radius Token | Shape | Units |
|--------------|-------|-------|
| radius-none | 0px | px |
| radius-xs | 1px | px |
| radius-sm | 4px | px |
| radius-md | 6px | px |
| radius-lg | 8px | px |
| radius-xl | 16px | px |

## Components

(none detected)

## Do's and Don'ts

Guardrails protect Single-family weight hierarchy, Layered elevation without adding unsupported visual claims.

| Do | Don't |
|----|---------|
| Do maintain consistent spacing using the base grid | Don't make unsupported claims about absent visual features |
| Do maintain WCAG AA contrast ratios (4.5:1 for normal text) | Don't mix rounded and sharp corners in the same view |
| Do use the primary color only for the single most important action per screen |  |
| Do verify evidence before writing new design-system guidance |  |

## Responsive Evidence

### Breakpoints

No distinct responsive breakpoints were extracted.

## Agent Prompt Guide

### Example Component Prompts
- Create button component using validated primary color role and spacing tokens.
- Create card component with mapped radius role and evidence-backed elevation.
- Create form input component using inferred typography hierarchy and border roles.

### Iteration Guide
1. Start with extracted palette and typography roles only.
2. Map spacing and radius directly from token tables before visual polish.
3. Apply component patterns one section at a time and compare against source intent.
4. Keep elevation claims tied to explicit evidence in output.
5. Iterate with smallest diffs and re-check section hierarchy after each change.
