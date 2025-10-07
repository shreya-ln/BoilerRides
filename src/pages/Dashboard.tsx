import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Users, Plus, Clock, Car } from "lucide-react";
import Navigation from "@/components/Navigation";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { ridesService } from "@/lib/ridesService";
import { format, parseISO } from "date-fns";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [hosting, setHosting] = useState<any[]>([]);
  const [booked, setBooked] = useState<any[]>([]);

  const handleSignOut = () => {
    // In a real app, this would clear auth tokens/session
    navigate("/");
  };

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      const [{ data: host }, { data: bookedData }] = await Promise.all([
        ridesService.listUpcomingHosting(user.id),
        ridesService.listUpcomingBooked(user.id),
      ]);
      setHosting(host || []);
      setBooked(bookedData || []);
    };
    load();
  }, [user?.id]);

  const quickActions = [
    { label: "Find a Ride", icon: Car, action: () => navigate("/rides") },
    { label: "Offer a Ride", icon: Plus, action: () => navigate("/rides") },
    { label: "View Profile", icon: Users, action: () => navigate("/profile") }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation isLoggedIn={true} onSignOut={handleSignOut} />
      
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-secondary mb-2">Welcome back, Boilermaker!</h1>
          <p className="text-muted-foreground">Ready for your next ride?</p>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Card 
                key={index} 
                className="hover:shadow-purdue transition-shadow cursor-pointer"
                onClick={action.action}
              >
                <CardContent className="p-6 text-center">
                  <div className="bg-primary/10 p-4 rounded-full w-fit mx-auto mb-4">
                    <Icon className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-semibold text-secondary">{action.label}</h3>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Upcoming Rides (live) */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-secondary mb-6">Your Upcoming Rides</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {hosting.map((r) => {
              const signedUp = Math.max(0, Number(r.total_seats) - Number(r.seats_available))
              const earnings = (signedUp * Number(r.price || 0)).toFixed(2)
              return (
              <Card key={`host-${r.id}`} className="hover:shadow-purdue transition-shadow bg-black text-white">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg text-white">
                      {r.special_moment ? <span className="text-primary">({r.special_moment})</span> : null} {r.origin} → {r.destination}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm">
                        <span className="inline-block px-2 py-1 border border-white rounded">You're driving</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm text-white/80">Earnings so far:</span>
                        <p className="text-lg font-bold text-primary">${earnings}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-white/80">{signedUp}/{r.total_seats} people signed up</div>
                      <Button size="sm" className="bg-white text-black hover:bg-white/90" onClick={() => navigate(`/rides/create?id=${r.id}`)}>
                        View Details
                      </Button>
                    </div>
                    <div className="flex items-center justify-between text-white/80 text-sm">
                      <div>{format(parseISO(r.ride_date), 'EEE, MMM d')} at {format(new Date(`1970-01-01T${r.ride_time}`), 'h:mm a')}</div>
                      <div>{r.seats_available}/{r.total_seats} seats available</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )})}
            {booked.map((b) => {
              const signedUp = Math.max(0, Number(b.rides.total_seats) - Number(b.rides.seats_available))
              return (
              <Card key={`book-${b.rides.id}`} className="hover:shadow-purdue transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg text-secondary">
                      {b.rides.special_moment ? <span className="text-primary">({b.rides.special_moment})</span> : null} {b.rides.origin} → {b.rides.destination}
                    </CardTitle>
                    <div className="flex items-center space-x-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm">{format(parseISO(b.rides.ride_date), 'EEE, MMM d')} at {format(new Date(`1970-01-01T${b.rides.ride_time}`), 'h:mm a')}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">Driver: {(b.rides.profiles && `${b.rides.profiles.first_name ?? ''} ${b.rides.profiles.last_name ?? ''}`.trim()) || '—'}</div>
                      <div className="text-sm text-muted-foreground">{signedUp}/{b.rides.total_seats} people signed up</div>
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div>{format(parseISO(b.rides.ride_date), 'EEE, MMM d')} at {format(new Date(`1970-01-01T${b.rides.ride_time}`), 'h:mm a')}</div>
                      <Button size="sm" variant="outline" onClick={() => navigate('/rides')}>
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )})}
          </div>
        </div>

        {/* Recent Activity (no placeholders) */}
        <div>
          <h2 className="text-2xl font-bold text-secondary mb-6">Recent Activity</h2>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">No recent activity yet.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;