import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Users, Clock, Search, Plus, Car } from "lucide-react";
import Navigation from "@/components/Navigation";
import { useNavigate } from "react-router-dom";

const Rides = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSignOut = () => {
    navigate("/");
  };

  const availableRides = [
    {
      id: 1,
      from: "West Lafayette",
      to: "Chicago Airport",
      date: "Tomorrow",
      time: "2:00 PM",
      driver: "Sarah M.",
      rating: 4.9,
      price: 30,
      seatsAvailable: 3,
      totalSeats: 4,
      duration: "2h 30m"
    },
    {
      id: 2,
      from: "Purdue Campus",
      to: "Indianapolis",
      date: "Saturday",
      time: "10:00 AM",
      driver: "Mike T.",
      rating: 4.8,
      price: 20,
      seatsAvailable: 2,
      totalSeats: 4,
      duration: "1h 45m"
    },
    {
      id: 3,
      from: "Downtown",
      to: "Tippecanoe Mall",
      date: "Today",
      time: "6:00 PM",
      driver: "Emma L.",
      rating: 5.0,
      price: 8,
      seatsAvailable: 1,
      totalSeats: 3,
      duration: "20m"
    }
  ];

  const myRides = [
    {
      id: 1,
      from: "West Lafayette",
      to: "Indianapolis",
      date: "Saturday",
      time: "10:00 AM",
      passengers: 3,
      totalSeats: 4,
      earnings: 60
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation isLoggedIn={true} onSignOut={handleSignOut} />
      
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-secondary mb-2">Rides</h1>
          <p className="text-muted-foreground">Find rides or offer your own to fellow Boilermakers</p>
        </div>

        <Tabs defaultValue="find" className="space-y-8">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="find">Find Rides</TabsTrigger>
            <TabsTrigger value="offer">My Rides</TabsTrigger>
          </TabsList>

          <TabsContent value="find" className="space-y-6">
            {/* Search Bar */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Where do you want to go?"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Button className="bg-gradient-primary hover:shadow-glow">
                    <Search className="h-4 w-4 mr-2" />
                    Search Rides
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Available Rides */}
            <div className="space-y-4">
              {availableRides.map((ride) => (
                <Card key={ride.id} className="hover:shadow-purdue transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <MapPin className="h-4 w-4 text-primary" />
                          <span className="font-semibold text-secondary">
                            {ride.from} → {ride.to}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-3">
                          <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4" />
                            <span>{ride.date}, {ride.time}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Car className="h-4 w-4" />
                            <span>{ride.duration}</span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4">
                          <span className="text-sm">Driver: {ride.driver}</span>
                          <Badge variant="secondary">★ {ride.rating}</Badge>
                          <div className="flex items-center space-x-1 text-sm">
                            <Users className="h-4 w-4" />
                            <span>{ride.seatsAvailable}/{ride.totalSeats} seats</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="text-2xl font-bold text-primary">${ride.price}</div>
                          <div className="text-xs text-muted-foreground">per person</div>
                        </div>
                        <Button className="bg-gradient-primary hover:shadow-glow">
                          Request Ride
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="offer" className="space-y-6">
            {/* Offer Ride Button */}
            <Card>
              <CardContent className="p-6 text-center">
                <div className="bg-primary/10 p-4 rounded-full w-fit mx-auto mb-4">
                  <Plus className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-secondary mb-2">Offer a New Ride</h3>
                <p className="text-muted-foreground mb-4">
                  Share your trip with fellow Boilermakers and earn money for gas
                </p>
                <Button className="bg-gradient-primary hover:shadow-glow">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Ride Offer
                </Button>
              </CardContent>
            </Card>

            {/* My Offered Rides */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-secondary">Your Offered Rides</h3>
              {myRides.map((ride) => (
                <Card key={ride.id} className="hover:shadow-purdue transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <MapPin className="h-4 w-4 text-primary" />
                          <span className="font-semibold text-secondary">
                            {ride.from} → {ride.to}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-3">
                          <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4" />
                            <span>{ride.date}, {ride.time}</span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-1 text-sm">
                            <Users className="h-4 w-4" />
                            <span>{ride.passengers}/{ride.totalSeats} passengers</span>
                          </div>
                          <Badge variant="outline">You're driving</Badge>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="text-2xl font-bold text-primary">${ride.earnings}</div>
                          <div className="text-xs text-muted-foreground">total earnings</div>
                        </div>
                        <div className="flex flex-col space-y-2">
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                          <Button variant="outline" size="sm">
                            Edit Ride
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Rides;