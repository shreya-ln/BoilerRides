# Purdue Colors Quick Start Guide

## 🎨 Official Purdue Colors

```
Purdue Gold:        #daaa00
Supporting Color:   #cfb991
Purdue Black:       #000000
```

## 🚀 Quick Usage

### For Buttons
```jsx
// Primary Gold Button
<Button className="bg-gradient-primary hover:shadow-glow">
  Click Me
</Button>

// Black Button
<Button className="bg-secondary text-secondary-foreground">
  Secondary Action
</Button>
```

### For Text
```jsx
// Gold text
<h1 className="text-primary">Purdue Title</h1>

// Black text
<p className="text-secondary">Important Text</p>

// Muted text
<p className="text-muted-foreground">Description</p>
```

### For Cards
```jsx
// Standard card with hover effect
<Card className="hover:shadow-purdue transition-shadow">
  {/* Content */}
</Card>

// Gold border card
<Card className="border-primary">
  {/* Content */}
</Card>
```

### For Icons
```jsx
// Gold icon
<Train className="h-8 w-8 text-primary" />

// Icon with gold background
<div className="bg-primary/10 p-3 rounded-full">
  <Users className="h-6 w-6 text-primary" />
</div>
```

### For Backgrounds
```jsx
// Gold background
<div className="bg-primary text-primary-foreground">

// Black background
<div className="bg-secondary text-secondary-foreground">

// Light supporting background
<div className="bg-muted">
```

## 📍 Testing the Colors

1. Start the dev server: `npm run dev`
2. Visit http://localhost:5173/colors (requires login)
3. See all Purdue colors and examples in action

## 📚 Full Documentation

See `PURDUE_BRANDING.md` for complete documentation including:
- Detailed color specifications
- Accessibility guidelines
- All available utility classes
- Component examples
- Maintenance instructions

## ✅ What's Included

- ✅ Exact Purdue Gold (#daaa00) throughout
- ✅ Supporting color (#cfb991) for subtle elements
- ✅ Purdue Black for navigation and headers
- ✅ Gold gradients and effects
- ✅ Consistent hover states
- ✅ Accessible contrast ratios
- ✅ Dark mode support

## 🎯 Key Classes to Remember

| Class | Purpose |
|-------|---------|
| `text-primary` | Gold text |
| `bg-primary` | Gold background |
| `bg-gradient-primary` | Gold gradient |
| `shadow-purdue` | Purdue shadow |
| `hover:shadow-glow` | Gold glow on hover |
| `bg-secondary` | Black background |
| `text-secondary` | Black text |

---

**Questions?** Check `PURDUE_BRANDING.md` or visit the ColorShowcase at `/colors`

