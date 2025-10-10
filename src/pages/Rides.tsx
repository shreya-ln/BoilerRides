import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label as UILabel } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Users, Clock, Search, Plus, Car, CalendarIcon } from "lucide-react";

import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, parseISO } from "date-fns";

import Navigation from "@/components/Navigation";
import { useNavigate } from "react-router-dom";
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth'
import { ridesService } from '@/lib/ridesService'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'

const Rides = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useAuth()

  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState("");
  const [showOwnRides, setShowOwnRides] = useState(false);

  const handleSignOut = () => {
    navigate("/");
  };

  const [availableRides, setAvailableRides]  = useState([]);
  const [myRidesState, setMyRidesState] = useState([] as any[])

  const myRides = myRidesState

  useEffect(() => {
    const fetchRides = async () => {
      try {
        const { data, error } = await ridesService.listRides()
        if (error) {
          console.error("Error fetching rides:", error);
          return;
        }
        const filtered = (data || []).filter((r: any) => showOwnRides || r.driver_id !== user?.id)
        const sorted = filtered.sort((a: any, b: any) => {
          const aOwn = a.driver_id === user?.id ? 1 : 0
          const bOwn = b.driver_id === user?.id ? 1 : 0
          return bOwn - aOwn
        })
        setAvailableRides(sorted);
      } catch (err) {
        console.error("Unexpected error:", err);
      }
    };

    fetchRides();

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        fetchRides();
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [showOwnRides, user?.id]);

  useEffect(() => {
    const fetchMyRides = async () => {
      if (!user?.id) return
      const { data, error } = await ridesService.listMyRides(user.id)
      if (error) {
        console.error('Error fetching my rides:', error)
        return
      }
      const mapped = (data || []).map((r: any) => ({
        id: r.id,
        from: r.origin,
        to: r.destination,
        date: r.ride_date,
        time: r.ride_time,
        passengers: Math.max(0, (Number(r.total_seats) - Number(r.seats_available))),
        totalSeats: r.total_seats,
        price: Number(r.price || 0),
        specialMoment: r.special_moment || null,
      }))
      setMyRidesState(mapped)
    }
    fetchMyRides()
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        fetchMyRides()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [user?.id])

  const searchRides = async() => {
    let query = supabase.from("rides").select("*");
    if (searchQuery) {
      // query = query.or(`to.ilike.%${searchQuery}%,from.ilike.%${searchQuery}%`);
      query = query.ilike("destination", `%${searchQuery}%`);
    }
    if (selectedDate) {
      const formattedDate = format(selectedDate, "yyyy-MM-dd");
      query = query.eq("ride_date", formattedDate);
    }
    if (selectedTime) {
      query = query.lte("ride_time", selectedTime);
    }
    const { data, error } = await query;

    if (error) {
      console.error("Error fetching rides:", error);
      return;
    }

    const filtered = (data || []).filter((r: any) => showOwnRides || r.driver_id !== user?.id)
    const sorted = filtered.sort((a: any, b: any) => {
      const aOwn = a.driver_id === user?.id ? 1 : 0
      const bOwn = b.driver_id === user?.id ? 1 : 0
      return bOwn - aOwn
    })
    setAvailableRides(sorted);
  };

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
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    searchRides();
                  }}
                  className="flex flex-col md:flex-row gap-4"
                >
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Where do you want to go?"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {/* date picker */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="justify-start text-left font-normal w-full md:w-[200px]"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, "PPP") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {selectedDate && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedDate(null)}
                      title="Clear date"
                    >
                      ✕
                    </Button>
                  )}

                  {/* time picker */}
                  <div className="relative md:w-[150px]">
                    <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="time"
                      value={selectedTime}
                      onChange={(e) => setSelectedTime(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  {selectedTime && (
                    <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedTime("")}
                    title="Clear time"
                    >
                    ✕
                    </Button>
                  )}

                  {/*  submit button */}
                  <Button
                    type="submit"
                    className="bg-gradient-primary hover:shadow-glow"
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Search Rides
                  </Button>
                  <div className="flex items-center gap-2 md:ml-auto">
                    <Switch id="showOwn" checked={showOwnRides} onCheckedChange={setShowOwnRides} />
                    <UILabel htmlFor="showOwn">Show my rides</UILabel>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Available Rides */}
            <div className="space-y-4">
              {availableRides.length == 0 && <h1>No rides found</h1>}
              {availableRides.map((ride) => (
                <Card key={ride.id} className={`hover:shadow-purdue transition-shadow ${user?.id === ride.driver_id ? 'bg-black text-white' : ''}`}>
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <MapPin className={`h-4 w-4 ${user?.id === ride.driver_id ? 'text-white' : 'text-primary'}`} />
                          <span className={`font-semibold ${user?.id === ride.driver_id ? 'text-white' : 'text-secondary'}`}>
                            {ride.special_moment ? <span className="text-primary">({ride.special_moment})</span> : ''} {ride.origin} → {ride.destination}
                          </span>
                        </div>
                        
                        <div className={`flex items-center space-x-4 text-sm mb-3 ${user?.id === ride.driver_id ? 'text-white/80' : 'text-muted-foreground'}`}>
                          <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4" />
                            <span>{format(parseISO(ride.ride_date), 'EEE, MMM d')} at {format(new Date(`1970-01-01T${ride.ride_time}`), 'h:mm a')}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Car className="h-4 w-4" />
                            <span>{ride.car_type || ride.duration || '—'}</span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4">
                          <span className={`text-sm ${user?.id === ride.driver_id ? 'text-white' : ''}`}>Driver: {ride.profiles ? `${ride.profiles.first_name ?? ''} ${ride.profiles.last_name ?? ''}`.trim() || '—' : '—'}</span>
                          {ride.rating && <Badge variant="secondary">★ {ride.rating}</Badge>}
                          <div className="flex items-center space-x-1 text-sm">
                            <Users className="h-4 w-4" />
                            <span>{ride.seats_available}/{ride.total_seats} seats available</span>
                          </div>
                          {user?.id === ride.driver_id && (
                            <Badge
                              variant={user?.id === ride.driver_id ? 'secondary' : 'outline'}
                              className={`ml-2 ${user?.id === ride.driver_id ? 'bg-white text-black border-white' : ''}`}
                            >
                              You're driving
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <div className="text-right">
                          <div className="text-2xl font-bold text-primary">${ride.price}</div>
                          <div className="text-xs text-muted-foreground">per person</div>
                        </div>
                        {user?.id !== ride.driver_id && (
                          <Button className="bg-gradient-primary hover:shadow-glow"> 
                            Request Ride
                          </Button>
                        )}
                        {user?.id === ride.driver_id && (
                          <div className="flex gap-2">
                            <Button variant={user?.id === ride.driver_id ? 'secondary' : 'outline'} className={`${user?.id === ride.driver_id ? 'bg-white text-black hover:bg-white/90' : ''}`} onClick={() => navigate(`/rides/create?id=${ride.id}`)}>Edit</Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant={user?.id === ride.driver_id ? 'secondary' : 'outline'} className={`${user?.id === ride.driver_id ? 'bg-white text-black hover:bg-white/90' : ''}`}>Delete</Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete this ride?</AlertDialogTitle>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={async () => {
                                    const { error } = await ridesService.deleteRide(ride.id)
                                    if (error) {
                                      console.error('Delete failed', error)
                                      return
                                    }
                                    // refresh
                                    const { data } = await ridesService.listRides()
                                    const filtered = (data || []).filter((r: any) => showOwnRides || r.driver_id !== user?.id)
                                    setAvailableRides(filtered)
                                  }}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        )}
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
              <CardContent className="p-4 text-center">
                <div className="bg-primary/10 p-4 rounded-full w-fit mx-auto mb-4">
                  <Plus className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-secondary mb-1">Offer a New Ride</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Share your trip and make money!
                </p>
                <Button size="sm" className="bg-gradient-primary hover:shadow-glow" onClick={() => navigate('/rides/create')}>
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
                            {ride.specialMoment ? <span className="text-primary">({ride.specialMoment})</span> : ''} {ride.from} → {ride.to}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-3">
                          <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4" />
                            <span>{format(parseISO(ride.date), 'EEE, MMM d')} at {format(new Date(`1970-01-01T${ride.time}`), 'h:mm a')}</span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-1 text-sm">
                            <Users className="h-4 w-4" />
                            <span>{ride.passengers}/{ride.totalSeats} passengers signed up</span>
                          </div>
                          <Badge variant="outline">You're driving</Badge>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <div className="text-right">
                          <div className="text-2xl font-bold text-primary">${(ride.passengers * ride.price).toFixed(2)}</div>
                          <div className="text-xs text-muted-foreground">estimated total</div>
                        </div>
                        <div className="flex flex-col space-y-2">
                          <Button variant="outline" size="sm" onClick={() => navigate(`/rides/create?id=${ride.id}`)}>
                            View / Edit
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
