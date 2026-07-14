# Ssemble Design System & Theme Settings

This document outlines the core design tokens, colors, typography, and visual conventions used in the application. It serves as a reference for future UI development to maintain a consistent aesthetic.

## 1. Color Palette

### Primary Actions
- **Primary Brand**: `#3782F7` (Base blue for main buttons and active states)
- **Primary Hover**: `#2563EB` (Darker blue for hover states)
- **Primary Gradient**: `linear-gradient(to right, #2e90fa, #c7bbfd)` (Used for prominent Call-To-Action buttons and hero text highlighting)
- **Primary Gradient Hover**: `linear-gradient(to right, #2674e8, #b8a9f5)`

### Backgrounds & Surfaces
- **App Background**: `#FFFFFF` (White) - Used for the main body background to keep it airy and clean.
- **Section Background (Alternate)**: `#F9FAFB` (Tailwind `gray-50`) - Used to separate sections visually without hard borders.
- **Card Background**: `#FFFFFF` (White) with subtle borders and shadows.
- **Highlighted Card (Pricing)**: `#ECF3FF` - A very light blue tint used for "Best Value" or "Most Chosen" cards.

### Text Colors
- **Headings (H1-H6)**: `#252b37` or `#000000` - Dark, high-contrast text.
- **Body Text**: `#6B7280` (Tailwind `gray-500`) or `#4B5563` (Tailwind `gray-600`) - Softer grays for readability on light backgrounds.
- **Muted Text**: `#9CA3AF` (Tailwind `gray-400`) - Used for small print and less important metadata.

### Accents & Indicators
- **Success / Savings**: `#16A34A` (Tailwind `green-600`) or `#1FBA48` - Used for "Save 60%" or "Best Value" tags.
- **Warning / Highlight**: `#FF6B00` or `#D97706` (Tailwind `amber-600`) - Used for discounted prices or bonus credits.

## 2. Typography

- **Font Family**: Clean sans-serif (e.g., `Inter`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `Roboto`).
- **Headings**: 
  - Should have tight letter spacing (`tracking-tight`).
  - Use `text-balance` for centered, multi-line headings to avoid orphans.
  - Extremely bold weights (`font-bold`, `font-extrabold`) for hero elements and pricing numbers.
- **Body**: 
  - Standard weights (`font-normal`, `font-medium`).
  - Relaxed line height (`leading-relaxed`) for readability.

## 3. UI Elements & Components

### Buttons
- **Gradient Button (Primary CTA)**:
  - Background: Gradient `from-[#2e90fa] to-[#c7bbfd]`
  - Text: White, font-semibold.
  - Border: Rounded corners (`rounded-2xl` or `rounded-xl`).
  - Interaction: Transform scale on hover (`hover:scale-105`), smooth transition (`transition-all duration-300`), subtle drop shadow (`shadow-lg`).
- **Solid Primary Button**:
  - Background: `#3782F7` (or Tailwind `blue-500`).
  - Text: White.
  - Use for secondary actions or sign-up flows.
- **Outline/Ghost Button**:
  - Transparent background with text color changing on hover.

### Containers & Layout
- **Max Widths**:
  - `max-w-7xl` (1280px) for the main navigation and wide grids (like Pricing).
  - `max-w-6xl` (1152px) for Hero text constraints.
  - `max-w-4xl` (896px) for centered components like video players and step-by-step guides.
- **Borders & Shadows**:
  - Soft, subtle borders on cards (`border border-gray-200`).
  - Elegant drop shadows for elevation (`shadow-md`, `shadow-lg`).
- **Border Radius**:
  - Extensive use of rounded corners to make the UI feel friendly (`rounded-2xl`, `rounded-3xl` for input bars, `rounded-full` for badges/icons).

### Input Fields
- White background (`bg-white`), subtle border (`border-2 border-gray-200`).
- Focus state should highlight with the primary brand color (`focus-within:border-[#2e90fa]`).
- Large padding (`px-6 py-4`) for a modern, accessible feel.

## 4. Animation & Micro-interactions
- **Hover Scales**: Interactive elements (buttons, feature icons) should have a slight bounce (`hover:scale-105`).
- **Transitions**: Smooth color and transform transitions on everything (`transition-all duration-300`).

---

*Keep this document updated as the design system evolves over time.*