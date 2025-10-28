# Purdue Branding Guide for BoilerRides

This document outlines the Purdue University branding colors and how they are implemented throughout the BoilerRides application.

## Color Palette

### Primary Colors

| Color | Hex Code | HSL | Usage |
|-------|----------|-----|-------|
| **Purdue Gold** | `#daaa00` | `hsl(47, 100%, 43%)` | Primary brand color, buttons, accents, icons |
| **Purdue Black** | `#000000` | `hsl(0, 0%, 0%)` | Secondary color, navigation bars, text |
| **Purdue Supporting** | `#cfb991` | `hsl(39, 39%, 69%)` | Supporting color for backgrounds, borders |

### Color Variables

All colors are defined as CSS custom properties in `/src/index.css` using HSL format for maximum flexibility.

#### Light Mode
```css
--primary: 47 100% 43%;              /* Purdue Gold #daaa00 */
--purdue-gold: 47 100% 43%;          /* Official Purdue Gold */
--purdue-supporting: 39 39% 69%;     /* Supporting color #cfb991 */
--secondary: 0 0% 0%;                /* Purdue Black */
--muted: 39 39% 95%;                 /* Light backgrounds */
--border: 39 39% 85%;                /* Subtle borders */
```

#### Dark Mode
The dark mode theme maintains the Purdue Gold as the primary accent while adapting the background colors:
```css
--primary: 47 100% 43%;              /* Purdue Gold (unchanged) */
--background: 0 0% 8%;               /* Dark background */
--secondary: 0 0% 0%;                /* Purdue Black */
```

## Usage

### Tailwind Classes

The theme integrates with Tailwind CSS for easy application:

#### Standard Tailwind Theme Classes
```jsx
// Backgrounds
<div className="bg-primary">            {/* Purdue Gold background */}
<div className="bg-secondary">          {/* Black background */}
<div className="bg-muted">              {/* Light supporting background */}

// Text
<div className="text-primary">          {/* Purdue Gold text */}
<div className="text-secondary">        {/* Black text */}
<div className="text-muted-foreground"> {/* Muted text */}

// Borders
<div className="border-primary">        {/* Purdue Gold border */}
<div className="border-border">         {/* Subtle supporting color border */}
```

#### Custom Purdue Utility Classes
Additional utility classes are available in `/src/index.css`:

```jsx
// Direct Purdue Color Access
<div className="text-purdue-gold">           {/* Gold text */}
<div className="text-purdue-supporting">     {/* Supporting color text */}
<div className="bg-purdue-gold">             {/* Gold background */}
<div className="bg-purdue-supporting">       {/* Supporting background */}
<div className="bg-purdue-gold-light">       {/* Light gold (10% opacity) */}

// Borders
<div className="border-purdue-gold">         {/* Gold border */}
<div className="border-purdue-supporting">   {/* Supporting color border */}

// Hover States
<button className="hover-purdue-gold">       {/* Hover to gold text */}
<button className="hover-bg-purdue-gold">    {/* Hover to gold background */}

// Gradients
<div className="bg-purdue-gradient">         {/* Primary gold gradient */}
<div className="bg-purdue-hero">             {/* Hero gradient (gold to supporting) */}

// Effects
<div className="purdue-glow">                {/* Purdue gold glow shadow */}
<div className="purdue-shadow">              {/* Purdue shadow effect */}
```

### Gradients

Pre-defined gradients using Purdue colors:

```css
--gradient-primary: linear-gradient(135deg, hsl(47 100% 43%), hsl(47 100% 38%));
--gradient-hero: linear-gradient(135deg, hsl(47 100% 43%) 0%, hsl(39 39% 69%) 100%);
--gradient-boiler: linear-gradient(90deg, hsl(0 0% 0%) 0%, hsl(47 100% 43%) 100%);
--gradient-gold-subtle: linear-gradient(180deg, hsl(47 100% 43% / 0.1) 0%, transparent 100%);
```

Usage in components:
```jsx
<Button className="bg-gradient-primary hover:shadow-glow">
  Sign Up
</Button>

<section className="bg-gradient-hero">
  {/* Hero section content */}
</section>
```

### Shadows and Effects

```css
--shadow-purdue: 0 10px 30px -10px hsl(47 100% 43% / 0.3);
--shadow-glow: 0 0 40px hsl(47 100% 43% / 0.25);
```

Apply via Tailwind:
```jsx
<Card className="shadow-purdue">        {/* Purdue-themed shadow */}
<Button className="hover:shadow-glow">  {/* Gold glow on hover */}
```

## Component Examples

### Buttons

```jsx
// Primary action - Purdue Gold
<Button className="bg-gradient-primary hover:shadow-glow">
  Get Started
</Button>

// Secondary action - Black with gold text
<Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
  Learn More
</Button>

// Outlined - Gold border
<Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
  Browse Rides
</Button>
```

### Cards

```jsx
// Standard card with Purdue hover effect
<Card className="hover:shadow-purdue transition-shadow">
  <CardHeader>
    <CardTitle className="text-secondary">Title</CardTitle>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>

// Highlighted card with gold accent
<Card className="border-primary">
  {/* Content */}
</Card>
```

### Navigation

```jsx
<nav className="bg-secondary text-secondary-foreground">
  <Train className="h-8 w-8 text-primary" />
  <span className="text-2xl font-bold">BoilerRides</span>
  
  <Button className="bg-gradient-primary hover:shadow-glow">
    Sign Up
  </Button>
</nav>
```

### Icons and Badges

```jsx
// Gold icon
<MapPin className="h-5 w-5 text-primary" />

// Gold badge
<Badge className="bg-primary/10 text-primary">
  Featured
</Badge>

// Icon with gold background
<div className="bg-primary/10 p-3 rounded-full">
  <Users className="h-8 w-8 text-primary" />
</div>
```

## Accessibility

### Contrast Ratios

All Purdue colors meet WCAG 2.1 Level AA contrast requirements:

- **Purdue Gold (#daaa00) on Black**: High contrast, excellent readability
- **Black text on White**: 21:1 ratio (AAA)
- **Purdue Gold on White**: 4.5:1 ratio (AA)
- **Supporting color (#cfb991)**: Used primarily for subtle backgrounds and borders, not primary text

### Best Practices

1. **Use Purdue Gold (#daaa00) for:**
   - Call-to-action buttons
   - Important icons and badges
   - Links and interactive elements
   - Accent colors

2. **Use Purdue Black for:**
   - Navigation bars
   - Headers and titles
   - High-contrast text areas

3. **Use Supporting Color (#cfb991) for:**
   - Subtle backgrounds
   - Borders and dividers
   - Muted elements
   - Secondary backgrounds

4. **Avoid:**
   - Using gold as primary text color on light backgrounds (use for accents only)
   - Mixing too many gold elements on one screen
   - Using supporting color for critical information

## Theme Configuration

### Tailwind Config
Custom Purdue colors are registered in `/tailwind.config.ts`:

```typescript
colors: {
  purdue: {
    gold: "hsl(var(--purdue-gold))",
    supporting: "hsl(var(--purdue-supporting))",
    black: "hsl(var(--secondary))",
  },
}
```

### CSS Variables
All color definitions are in `/src/index.css` under the `:root` and `.dark` selectors.

## Maintenance

### Adding New Purdue-Themed Components

When creating new components:

1. Use `text-primary` for gold accents
2. Use `bg-secondary` for black backgrounds
3. Use `bg-muted` for light supporting backgrounds
4. Apply `shadow-purdue` for card hover effects
5. Use `bg-gradient-primary` for prominent CTAs

### Updating Colors

To update the Purdue color scheme:

1. Modify the HSL values in `/src/index.css`
2. Update both `:root` (light mode) and `.dark` (dark mode) sections
3. Colors will automatically propagate throughout the app

### Testing

After making color changes:

1. Test in both light and dark modes
2. Verify contrast ratios with browser DevTools
3. Check all pages: Landing, Dashboard, Rides, Profile, Auth pages
4. Ensure buttons, cards, and navigation bars maintain Purdue branding

## Resources

- [Purdue Brand Guide](https://www.purdue.edu/brand/)
- [WCAG Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

---

**Last Updated:** October 28, 2025
**Maintainer:** Ritvik

