import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Train, Users, MapPin, Shield, Clock, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { ridesService } from "@/lib/ridesService";
import { format, parseISO } from "date-fns";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [hosting, setHosting] = useState<any[]>([]);
  const [booked, setBooked] = useState<any[]>([]);

  useEffect(() => {
    const loadUpcoming = async () => {
      if (!user?.id) return;
      const [{ data: host }, { data: bookedData }] = await Promise.all([
        ridesService.listUpcomingHosting(user.id),
        ridesService.listUpcomingBooked(user.id),
      ]);
      setHosting(host || []);
      setBooked(bookedData || []);
    };
    loadUpcoming();
  }, [user?.id]);
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="bg-secondary text-secondary-foreground px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Train className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">BoilerRides</span>
          </div>
          <div className="flex space-x-4">
            <Link to="/signin">
              <Button variant="ghost" className="text-secondary-foreground hover:text-primary">
                Sign In
              </Button>
            </Link>
            <Link to="/signup">
              <Button className="bg-gradient-primary hover:shadow-glow">
                Sign Up
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-hero py-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-secondary mb-6">
            Ride with Fellow <span className="text-primary">Boilermakers</span>
          </h1>
          <p className="text-xl text-secondary/80 mb-8 max-w-3xl mx-auto">
            Connect with Purdue students for safe, convenient, and affordable rides around campus and beyond. 
            Join the BoilerRides community today!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/signup">
              <Button size="lg" className="bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-purdue">
                Get Started
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground">
              Learn More
            </Button>
            <Button size="lg" className="bg-gradient-primary hover:shadow-glow" onClick={() => navigate('/rides/create')}>
              Post a Ride
            </Button>
          </div>
        </div>
      </section>

      {/* Upcoming Rides for the user */}
      {user && (
        <section className="py-16 px-6 bg-muted/30">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold mb-6 text-secondary">Upcoming Rides</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {hosting.map((r) => (
                <Card key={`host-${r.id}`} className="bg-black text-white">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{r.origin} → {r.destination}</CardTitle>
                      <Clock className="h-5 w-5" />
                    </div>
                    <CardDescription className="text-white/80">{format(parseISO(r.ride_date), 'EEE, MMM d')} at {format(new Date(`1970-01-01T${r.ride_time}`), 'h:mm a')}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
              {booked.map((b) => (
                <Card key={`book-${b.rides.id}`} className="border-primary">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg text-secondary">{b.rides.origin} → {b.rides.destination}</CardTitle>
                      <Clock className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <CardDescription>{format(parseISO(b.rides.ride_date), 'EEE, MMM d')} at {format(new Date(`1970-01-01T${b.rides.ride_time}`), 'h:mm a')}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Available Rides Section */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-4 text-secondary">
            Popular Destinations
          </h2>
          <p className="text-center text-muted-foreground mb-12">
            Quick rides to the places Boilermakers go most
          </p>
          
          <div className="grid md:grid-cols-4 gap-6 mb-16">
            <Card className="hover:shadow-purdue transition-shadow cursor-pointer">
              <CardContent className="p-6 text-center">
                <MapPin className="h-8 w-8 text-primary mx-auto mb-3" />
                <h3 className="font-semibold text-secondary mb-2">Chicago Airport</h3>
                <p className="text-sm text-muted-foreground">3 rides available</p>
                <p className="text-primary font-medium">$25-35</p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-purdue transition-shadow cursor-pointer">
              <CardContent className="p-6 text-center">
                <MapPin className="h-8 w-8 text-primary mx-auto mb-3" />
                <h3 className="font-semibold text-secondary mb-2">Indianapolis</h3>
                <p className="text-sm text-muted-foreground">5 rides available</p>
                <p className="text-primary font-medium">$15-20</p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-purdue transition-shadow cursor-pointer">
              <CardContent className="p-6 text-center">
                <MapPin className="h-8 w-8 text-primary mx-auto mb-3" />
                <h3 className="font-semibold text-secondary mb-2">Mall</h3>
                <p className="text-sm text-muted-foreground">2 rides available</p>
                <p className="text-primary font-medium">$5-8</p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-purdue transition-shadow cursor-pointer">
              <CardContent className="p-6 text-center">
                <MapPin className="h-8 w-8 text-primary mx-auto mb-3" />
                <h3 className="font-semibold text-secondary mb-2">Downtown</h3>
                <p className="text-sm text-muted-foreground">4 rides available</p>
                <p className="text-primary font-medium">$3-5</p>
              </CardContent>
            </Card>
          </div>

          <h3 className="text-2xl font-bold text-center mb-8 text-secondary">
            Recent Ride Offers
          </h3>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="hover:shadow-purdue transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg text-secondary">West Lafayette → Chicago</CardTitle>
                  <Clock className="h-5 w-5 text-muted-foreground" />
                </div>
                <CardDescription>Tomorrow, 2:00 PM</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm">3 seats available</span>
                  </div>
                  <span className="text-lg font-bold text-primary">$30</span>
                </div>
                <p className="text-sm text-muted-foreground mb-4">Driver: Sarah M. • Engineering Student</p>
                <Button className="w-full bg-gradient-primary hover:shadow-glow">
                  Request Ride
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-purdue transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg text-secondary">Campus → Airport</CardTitle>
                  <Clock className="h-5 w-5 text-muted-foreground" />
                </div>
                <CardDescription>Today, 6:00 PM</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm">1 seat available</span>
                  </div>
                  <span className="text-lg font-bold text-primary">$35</span>
                </div>
                <p className="text-sm text-muted-foreground mb-4">Driver: Mike T. • Business Student</p>
                <Button className="w-full bg-gradient-primary hover:shadow-glow">
                  Request Ride
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-purdue transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg text-secondary">Purdue → Mall</CardTitle>
                  <Clock className="h-5 w-5 text-muted-foreground" />
                </div>
                <CardDescription>Saturday, 1:00 PM</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm">2 seats available</span>
                  </div>
                  <span className="text-lg font-bold text-primary">$7</span>
                </div>
                <p className="text-sm text-muted-foreground mb-4">Driver: Emma L. • CS Student</p>
                <Button className="w-full bg-gradient-primary hover:shadow-glow">
                  Request Ride
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12 text-secondary">
            Why Choose BoilerRides?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center hover:shadow-purdue transition-shadow">
              <CardHeader>
                <div className="bg-primary/10 p-3 rounded-full w-fit mx-auto mb-4">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-secondary">Purdue Community</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Connect exclusively with verified Purdue students, faculty, and staff for trusted rides.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-purdue transition-shadow">
              <CardHeader>
                <div className="bg-primary/10 p-3 rounded-full w-fit mx-auto mb-4">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-secondary">Safe & Secure</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Enhanced safety features with verified user profiles and community guidelines.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-purdue transition-shadow">
              <CardHeader>
                <div className="bg-primary/10 p-3 rounded-full w-fit mx-auto mb-4">
                  <DollarSign className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-secondary">Affordable</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Split costs with fellow Boilermakers and save money on transportation.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12 text-secondary">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="bg-gradient-primary p-4 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                <span className="text-2xl font-bold text-primary-foreground">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-secondary">Sign Up</h3>
              <p className="text-muted-foreground">
                Create your account with your Purdue email and get verified instantly.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-gradient-primary p-4 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                <span className="text-2xl font-bold text-primary-foreground">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-secondary">Find Rides</h3>
              <p className="text-muted-foreground">
                Search for available rides or post your own trip for others to join.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-gradient-primary p-4 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                <span className="text-2xl font-bold text-primary-foreground">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-secondary">Ride Safe</h3>
              <p className="text-muted-foreground">
                Enjoy your journey with trusted community members and 24/7 support.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-secondary py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6 text-secondary-foreground">
            Ready to Join the Boiler Community?
          </h2>
          <p className="text-xl mb-8 text-secondary-foreground/80">
            Start riding with fellow Boilermakers today. It's free to join!
          </p>
          <Link to="/signup">
            <Button size="lg" className="bg-gradient-primary hover:shadow-glow text-primary-foreground">
              Get Started Now
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background border-t border-border py-8 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Train className="h-6 w-6 text-primary" />
            <span className="text-lg font-semibold text-secondary">BoilerRides</span>
          </div>
          <p className="text-muted-foreground">
            Connecting the Purdue community, one ride at a time.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;