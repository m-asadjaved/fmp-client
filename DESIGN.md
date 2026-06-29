---
name: Lumina AI
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#424754'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#727785'
  outline-variant: '#c2c6d6'
  surface-tint: '#005bc1'
  primary: '#0058bc'
  on-primary: '#ffffff'
  primary-container: '#1a71e5'
  on-primary-container: '#fefcff'
  inverse-primary: '#adc6ff'
  secondary: '#605691'
  on-secondary: '#ffffff'
  secondary-container: '#c7bbfd'
  on-secondary-container: '#524982'
  tertiary: '#005cab'
  on-tertiary: '#ffffff'
  tertiary-container: '#0075d7'
  on-tertiary-container: '#fefcff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a41'
  on-primary-fixed-variant: '#004494'
  secondary-fixed: '#e6deff'
  secondary-fixed-dim: '#cabeff'
  on-secondary-fixed: '#1c1149'
  on-secondary-fixed-variant: '#483f77'
  tertiary-fixed: '#d5e3ff'
  tertiary-fixed-dim: '#a6c8ff'
  on-tertiary-fixed: '#001c3b'
  on-tertiary-fixed-variant: '#004786'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
  neon-purple: '#A855F7'
  vibrant-teal: '#14B8A6'
  surface-bg: '#F8FAFC'
  border-subtle: '#E2E8F0'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 48px
  container-max: 1280px
---

## Brand & Style

The design system is engineered for a high-performance AI video clipping SaaS, targeting content creators, social media managers, and digital marketers. The brand personality is efficient, intelligent, and forward-leaning, bridging the gap between complex AI processing and creative expression.

The design style is **Corporate / Modern** with subtle **Glassmorphism** influences. It prioritizes clarity and speed, utilizing a sophisticated palette and structured layout to instill professional trust. Visual interest is achieved through high-tech accents—such as soft glows and precision borders—evoking the feeling of a powerful, modern workspace where technology does the heavy lifting.

## Colors

The color strategy centers on a deep, reliable blue as the primary foundation, establishing authority and stability. High-tech accents of neon purple and vibrant teal are used sparingly to highlight AI-driven features, status indicators, and creative actions.

- **Primary & Tertiary:** Shades of blue and indigo are used for primary actions, navigation, and structural brand elements.
- **Secondary:** A soft lavender used for backgrounds of highlighted sections or "Pro" tier features.
- **Named Accents:** Neon purple signifies "AI Intelligence" or "Magic" features. Teal is used for positive status and growth metrics.
- **Neutrals:** A slate-based neutral palette ensures the UI remains clean and avoids the harshness of pure black, providing better readability and a premium feel.

## Typography

This design system utilizes **Inter** exclusively to maintain a systematic, utilitarian aesthetic that focuses on legibility across data-heavy interfaces.

- **Scale:** Headlines use tight letter-spacing and bold weights to command attention, while body text uses generous line-height for readability.
- **Hierarchy:** Display styles are reserved for marketing hero sections. Labels use medium to semi-bold weights and slight tracking to distinguish them from body copy in functional areas like dashboards and sidebars.
- **Adaptability:** Large headlines scale down on mobile to prevent awkward text wrapping, maintaining a cohesive vertical rhythm.

## Layout & Spacing

The system follows a **Fixed Grid** model for desktop, centering content within a 1280px container to maintain visual control over the video editing workspace. On mobile, the layout shifts to a fluid 4-column structure.

- **Spacing Rhythm:** Based on a 4px baseline. Most components use 8px (sm), 16px (md), or 24px (lg) increments for internal padding and external margins.
- **Breakpoints:**
    - Mobile: 0 - 767px (Fluid, 16px margins)
    - Tablet: 768px - 1023px (Fluid, 24px margins)
    - Desktop: 1024px+ (Fixed 1280px max-width)
- **Reflow:** Complex video grids reflow from 3 or 4 columns on desktop to 1 column on mobile to preserve aspect ratio clarity.

## Elevation & Depth

Depth is established through **Tonal Layers** and **Ambient Shadows**. Surfaces are layered to indicate functional priority:

1.  **Background:** The base layer (#F8FAFC).
2.  **Surface-Low:** Cards and containers use a white background with a very soft, 1px border (#E2E8F0) and no shadow for a clean look.
3.  **Surface-High:** Active elements, modals, and dropdowns use a multi-layered ambient shadow (Blur: 20px, Y: 10px, Opacity: 4%) with a slight blue tint in the shadow color to maintain brand harmony.
4.  **Glassmorphism:** Sticky headers and video overlays utilize a backdrop blur (12px) with a semi-transparent white fill (80% opacity) to maintain context of the underlying content.

## Shapes

The design system uses a **Rounded** shape language to feel approachable yet modern.

- **Standard (0.5rem):** Used for buttons, input fields, and standard cards.
- **Large (1rem):** Used for primary container blocks and featured sections.
- **Extra Large (1.5rem):** Used for marketing assets and large promotional cards.
- **Interactive States:** On hover, buttons do not change shape, but cards may slightly increase their elevation to indicate interactivity.

## Components

### Buttons
- **Primary:** Solid fill using the primary blue. High-contrast white text.
- **Secondary:** Ghost style with the primary blue border and text.
- **AI Action:** Gradient fill (Primary Blue to Neon Purple) to signify automated processes.

### Cards
- Clean, white backgrounds with subtle borders. Internal padding is strictly 24px. Featured cards (like pricing or AI highlights) may feature a soft secondary color background or a 2px top border in an accent color.

### Input Fields
- High-affordance design with 16px horizontal padding. Active states use a 2px primary blue ring. Placeholder text uses a light slate gray.

### Status Badges
- Small, uppercase labels with a subtle background tint of the status color (e.g., Teal for "Ready", Purple for "Processing", Red for "Error"). Font weight is set to 600 for legibility at small sizes.

### Video Progress Bar
- A custom component for the video clipper: the background is a subtle slate with the "active" portion using the primary-to-purple gradient. Handles are circular and highly tactile.