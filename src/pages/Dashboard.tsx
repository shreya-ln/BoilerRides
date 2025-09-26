import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Users, Plus, Clock, Car } from "lucide-react";
import Navigation from "@/components/Navigation";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const navigate = useNavigate();

  const handleSignOut = () => {
    // In a real app, this would clear auth tokens/session
    navigate("/");
  };

  const upcomingRides = [
    {
      id: 1,
      destination: "Chicago Airport",
      date: "Tomorrow",
      time: "2:00 PM",
      driver: "Sarah M.",
      price: "$30",
      seats: 2
    },
    {
      id: 2,
      destination: "Indianapolis",
      date: "Saturday",
      time: "10:00 AM",
      driver: "You",
      price: "$20",
      seats: 3
    }
  ];

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

        {/* Upcoming Rides */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-secondary mb-6">Your Upcoming Rides</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {upcomingRides.map((ride) => (
              <Card key={ride.id} className="hover:shadow-purdue transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg text-secondary">{ride.destination}</CardTitle>
                    <div className="flex items-center space-x-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm">{ride.date}, {ride.time}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {ride.driver === "You" ? "You're driving" : `Driver: ${ride.driver}`}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {ride.seats} seats {ride.driver === "You" ? "available" : "reserved"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">{ride.price}</p>
                      <Button size="sm" variant="outline">
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h2 className="text-2xl font-bold text-secondary mb-6">Recent Activity</h2>
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-4 p-4 bg-muted/30 rounded-lg">
                  <div className="bg-green-100 p-2 rounded-full">
                    <Car className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-secondary">Ride completed to Downtown</p>
                    <p className="text-sm text-muted-foreground">Yesterday, 6:30 PM</p>
                  </div>
                  <p className="text-primary font-medium">$5.00</p>
                </div>
                
                <div className="flex items-center space-x-4 p-4 bg-muted/30 rounded-lg">
                  <div className="bg-blue-100 p-2 rounded-full">
                    <Users className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-secondary">Profile updated</p>
                    <p className="text-sm text-muted-foreground">2 days ago</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;