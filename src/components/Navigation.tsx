import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Train, Home, Car, User, LogOut, ScrollText, Users2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavigationProps {
  isLoggedIn?: boolean;
  onSignOut?: () => void;
}

const Navigation = ({ isLoggedIn = false, onSignOut }: NavigationProps) => {
  const location = useLocation();
  
  const navItems = [
    { to: "/dashboard", label: "Home", icon: Home },
    { to: "/rides", label: "Rides", icon: Car },
    { to: "/ride-requests", label: "Ride Requests", icon: ScrollText },
    { to: "/ride-invites", label: "Ride Invites", icon: Users2 },
    { to: "/profile", label: "Profile", icon: User },
  ];

  return (
    <nav className="bg-secondary text-secondary-foreground px-6 py-4 border-b border-border">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <Link to={isLoggedIn ? "/dashboard" : "/"} className="flex items-center space-x-2">
          <Train className="h-8 w-8 text-primary" />
          <span className="text-2xl font-bold">BoilerRides</span>
        </Link>
        
        <div className="flex items-center space-x-4">
          {isLoggedIn ? (
            <>
              {/* Main Navigation */}
              <div className="hidden md:flex items-center space-x-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.to;
                  return (
                    <Link key={item.to} to={item.to}>
                      <Button
                        variant="ghost"
                        className={cn(
                          "text-secondary-foreground hover:text-primary flex items-center space-x-2",
                          isActive && "bg-primary/10 text-primary"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Button>
                    </Link>
                  );
                })}
              </div>
              
              {/* Sign Out */}
              <Button
                variant="ghost"
                onClick={onSignOut}
                className="text-secondary-foreground hover:text-destructive flex items-center space-x-2"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>
      
      {/* Mobile Navigation */}
      {isLoggedIn && (
        <div className="md:hidden mt-4 pt-4 border-t border-border">
          <div className="flex justify-around">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.to;
              return (
                <Link key={item.to} to={item.to}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "flex flex-col items-center space-y-1 h-auto py-2",
                      isActive ? "text-primary" : "text-secondary-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-xs">{item.label}</span>
                  </Button>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navigation;
