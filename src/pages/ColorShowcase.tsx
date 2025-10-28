import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Train, MapPin, Users, DollarSign } from "lucide-react";
import Navigation from "@/components/Navigation";
import { useNavigate } from "react-router-dom";

/**
 * ColorShowcase component - Visual reference for Purdue branding
 * This page displays all Purdue colors and their applications
 * Useful for development and design consistency checks
 */
const ColorShowcase = () => {
  const navigate = useNavigate();

  const handleSignOut = () => {
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation isLoggedIn={true} onSignOut={handleSignOut} />
      
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-secondary mb-2">
            Purdue Branding <span className="text-primary">Color Showcase</span>
          </h1>
          <p className="text-muted-foreground">
            Visual reference for BoilerRides color palette and component styling
          </p>
        </div>

        {/* Color Palette Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-secondary mb-6">Color Palette</h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            {/* Purdue Gold */}
            <Card>
              <CardContent className="p-6">
                <div className="bg-primary h-32 rounded-lg mb-4 flex items-center justify-center">
                  <span className="text-primary-foreground font-bold">Purdue Gold</span>
                </div>
                <div className="space-y-2 text-sm">
                  <p><strong>Hex:</strong> #daaa00</p>
                  <p><strong>HSL:</strong> 47, 100%, 43%</p>
                  <p><strong>Usage:</strong> Primary brand color, buttons, accents</p>
                </div>
              </CardContent>
            </Card>

            {/* Purdue Black */}
            <Card>
              <CardContent className="p-6">
                <div className="bg-secondary h-32 rounded-lg mb-4 flex items-center justify-center">
                  <span className="text-secondary-foreground font-bold">Purdue Black</span>
                </div>
                <div className="space-y-2 text-sm">
                  <p><strong>Hex:</strong> #000000</p>
                  <p><strong>HSL:</strong> 0, 0%, 0%</p>
                  <p><strong>Usage:</strong> Navigation, headers, emphasis</p>
                </div>
              </CardContent>
            </Card>

            {/* Supporting Color */}
            <Card>
              <CardContent className="p-6">
                <div className="bg-purdue-supporting h-32 rounded-lg mb-4 flex items-center justify-center">
                  <span className="text-secondary font-bold">Supporting Color</span>
                </div>
                <div className="space-y-2 text-sm">
                  <p><strong>Hex:</strong> #cfb991</p>
                  <p><strong>HSL:</strong> 39, 39%, 69%</p>
                  <p><strong>Usage:</strong> Backgrounds, borders, subtle accents</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Buttons Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-secondary mb-6">Buttons</h2>
          
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Primary Actions</h3>
                  <div className="flex flex-wrap gap-4">
                    <Button className="bg-gradient-primary hover:shadow-glow">
                      Sign Up
                    </Button>
                    <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                      Get Started
                    </Button>
                    <Button className="bg-primary/10 text-primary hover:bg-primary/20">
                      Learn More
                    </Button>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Secondary Actions</h3>
                  <div className="flex flex-wrap gap-4">
                    <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
                      Browse Rides
                    </Button>
                    <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                      View Details
                    </Button>
                    <Button variant="ghost" className="text-secondary hover:text-primary">
                      Cancel
                    </Button>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Button Sizes</h3>
                  <div className="flex flex-wrap gap-4 items-center">
                    <Button size="sm" className="bg-gradient-primary">
                      Small
                    </Button>
                    <Button size="default" className="bg-gradient-primary">
                      Default
                    </Button>
                    <Button size="lg" className="bg-gradient-primary">
                      Large
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Cards Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-secondary mb-6">Cards</h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="hover:shadow-purdue transition-shadow">
              <CardHeader>
                <div className="bg-primary/10 p-3 rounded-full w-fit mx-auto mb-2">
                  <MapPin className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-secondary text-center">Standard Card</CardTitle>
                <CardDescription className="text-center">
                  Default card with Purdue hover effect
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-primary">
              <CardHeader>
                <div className="bg-primary/10 p-3 rounded-full w-fit mx-auto mb-2">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-secondary text-center">Highlighted Card</CardTitle>
                <CardDescription className="text-center">
                  Card with Purdue Gold border
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-secondary text-secondary-foreground">
              <CardHeader>
                <div className="bg-primary p-3 rounded-full w-fit mx-auto mb-2">
                  <Train className="h-6 w-6 text-primary-foreground" />
                </div>
                <CardTitle className="text-secondary-foreground text-center">Dark Card</CardTitle>
                <CardDescription className="text-secondary-foreground/80 text-center">
                  Card with black background
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </section>

        {/* Gradients Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-secondary mb-6">Gradients</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="p-0">
                <div className="bg-gradient-primary h-32 rounded-t-lg flex items-center justify-center">
                  <span className="text-primary-foreground font-bold">Primary Gradient</span>
                </div>
                <div className="p-4">
                  <p className="text-sm text-muted-foreground">
                    Used for CTAs and important buttons
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-0">
                <div className="bg-gradient-hero h-32 rounded-t-lg flex items-center justify-center">
                  <span className="text-secondary font-bold">Hero Gradient</span>
                </div>
                <div className="p-4">
                  <p className="text-sm text-muted-foreground">
                    Used for hero sections and large backgrounds
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Icons & Badges Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-secondary mb-6">Icons & Badges</h2>
          
          <Card>
            <CardContent className="p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Icon Variations</h3>
                  <div className="flex flex-wrap gap-6 items-center">
                    <MapPin className="h-8 w-8 text-primary" />
                    <div className="bg-primary/10 p-2 rounded-full">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <div className="bg-primary p-2 rounded-full">
                      <DollarSign className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <div className="bg-secondary p-2 rounded-full">
                      <Train className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Badges</h3>
                  <div className="flex flex-wrap gap-3">
                    <Badge className="bg-primary text-primary-foreground">Featured</Badge>
                    <Badge className="bg-primary/10 text-primary">Purdue Gold</Badge>
                    <Badge className="bg-secondary text-secondary-foreground">Black</Badge>
                    <Badge variant="outline" className="border-primary text-primary">Outlined</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Typography Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-secondary mb-6">Typography</h2>
          
          <Card>
            <CardContent className="p-6 space-y-4">
              <div>
                <h1 className="text-4xl font-bold text-secondary mb-2">
                  Heading 1 with <span className="text-primary">Gold Accent</span>
                </h1>
                <p className="text-muted-foreground">Primary heading style</p>
              </div>

              <div>
                <h2 className="text-3xl font-bold text-secondary mb-2">
                  Heading 2 Style
                </h2>
                <p className="text-muted-foreground">Secondary heading style</p>
              </div>

              <div>
                <p className="text-base text-foreground mb-2">
                  Body text with <span className="text-primary font-semibold">Purdue Gold highlight</span> and regular flow.
                  This is the standard text style used throughout the application.
                </p>
                <p className="text-sm text-muted-foreground">
                  Muted text for secondary information and descriptions.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Effects Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-secondary mb-6">Effects & Shadows</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="shadow-purdue">
              <CardContent className="p-8 text-center">
                <h3 className="font-bold text-secondary mb-2">Purdue Shadow</h3>
                <p className="text-sm text-muted-foreground">
                  Subtle gold shadow effect
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-glow">
              <CardContent className="p-8 text-center">
                <h3 className="font-bold text-secondary mb-2">Gold Glow</h3>
                <p className="text-sm text-muted-foreground">
                  Prominent glow effect
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Usage Notes */}
        <section className="mb-12">
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="text-secondary">Usage Guidelines</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>
                <strong className="text-primary">Purdue Gold (#daaa00):</strong> Use for primary actions,
                key icons, accents, and interactive elements. Represents the official Purdue brand.
              </p>
              <p>
                <strong className="text-secondary">Purdue Black:</strong> Use for navigation bars,
                headers, and high-contrast text areas. Provides strong visual hierarchy.
              </p>
              <p>
                <strong className="text-purdue-supporting">Supporting Color (#cfb991):</strong> Use for
                subtle backgrounds, borders, and secondary elements. Complements the primary colors.
              </p>
              <p className="text-muted-foreground pt-2">
                For detailed documentation, see PURDUE_BRANDING.md in the project root.
              </p>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
};

export default ColorShowcase;

