# Snow White Laundry — Design System

## Philosophy

- **Aesthetic**: Monochrome, poetic, calm, reflective, intimate, elegant
- **Material**: OLED-black mirror surfaces, soft reflection, thin glow, low-opacity glass edges
- **Atmosphere**: Sparse starfield, slow drift, zero color accents (luminance-only)
- **Typography**: Söhne / Inter (headings Title Case, body sentence case)
- **Motion**: Physics-driven micro-drift, ease-out ceremonial transitions, slow luminance fades
- **Identity**: intention · emotion · craft (implicit everywhere)
- **Tone**: No marketing voice. Calm precision. Minimalism with emotional weight.

## Components

### Core Components
- `SiteShell` - Main container with starfield background
- `StarField` - Sparse animated starfield layers
- `GlassPanel` - Base glass surface with drift physics
- `RitualTransition` - Ceremonial entrance animations
- `PageHeader` - Standardized page headers
- `PageFooter` - Standardized page footers
- `GlassDivider` - Subtle divider lines
- `GlassSection` - Content sections with glass styling

### UI Components
- `GlassButton` - Buttons with glass styling
- `GlassInput` - Text inputs with glass styling
- `GlassTextarea` - Textarea with glass styling
- `GlassForm` - Form container
- `GlassNav` - Navigation component
- `GlassCard` - Card component

## Design Tokens

Located in `/src/design/`:
- `tokens.css` - CSS custom properties
- `motion.ts` - Motion curves and timing
- `reflections.ts` - Reflection physics
- `atmosphere.ts` - Starfield configuration

## Pages

### Public Pages
- `/` - Landing page
- `/prelude` - Philosophy introduction
- `/reserve` - Reservation request (placeholder)
- `/contact` - Contact form

### Staff Pages
- `/staff` - Owner dashboard (placeholders)
- `/staff/breadcrumbs` - Breadcrumb creator (redesigned)

## JSON-LD Schemas

- Restaurant schema (landing page)
- ContactPage schema (contact page)
- ComingSoon schema (available)

## Usage

```tsx
import { SiteShell, PageHeader, GlassButton } from "@/components/design";

export default function MyPage() {
  return (
    <SiteShell>
      <PageHeader title="My Page" />
      <GlassButton href="/other">Navigate</GlassButton>
    </SiteShell>
  );
}
```
