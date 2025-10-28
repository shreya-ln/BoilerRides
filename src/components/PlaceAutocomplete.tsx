import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  useMapsLibrary,
} from '@vis.gl/react-google-maps';

interface PlaceAutocompleteProps {
  onPlaceSelect: (place: google.maps.places.PlaceResult | null) => void;
  placeholder?: string;
  className?: string;
  value?: string;
  onChange?: (value: string) => void;
}

// Rate limiting constants
const DEBOUNCE_MS = 1000; // Wait 1000ms after user stops typing before counting as a search
const MAX_SEARCHES = 10; // Maximum searches allowed
const RATE_LIMIT_WINDOW_MS = 15000; // 15 seconds window
const LOCKOUT_DURATION_MS = 5000; // 5 seconds lockout

// Debug mode: Toggle this to show/hide the search counter
const SHOW_DEBUG_COUNTER = true; // Set to false to hide the counter

/**
 * PlaceAutocomplete component that provides Google Places autocomplete functionality
 * with built-in rate limiting and debouncing
 * - Debounces input by 500ms after user stops typing
 * - Limits to 10 searches per 15 seconds
 * - Locks out for 5 seconds if rate limit exceeded
 */
const PlaceAutocomplete = ({ 
  onPlaceSelect, 
  placeholder = "Enter location...", 
  className = "",
  value = "",
  onChange
}: PlaceAutocompleteProps) => {
  const [placeAutocomplete, setPlaceAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutCountdown, setLockoutCountdown] = useState(0);
  const [searchesRemaining, setSearchesRemaining] = useState(MAX_SEARCHES);
  const inputRef = useRef<HTMLInputElement>(null);
  const places = useMapsLibrary('places');
  
  // Rate limiting tracking
  const searchTimestamps = useRef<number[]>([]);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const lockoutTimer = useRef<NodeJS.Timeout | null>(null);
  const countdownInterval = useRef<NodeJS.Timeout | null>(null);
  const updateCounterInterval = useRef<NodeJS.Timeout | null>(null);
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);

  /**
   * Update the remaining searches counter
   * Removes old timestamps and calculates how many searches are left
   */
  const updateSearchesRemaining = useCallback(() => {
    const now = Date.now();
    // Remove timestamps older than the rate limit window
    searchTimestamps.current = searchTimestamps.current.filter(
      timestamp => now - timestamp < RATE_LIMIT_WINDOW_MS
    );
    
    const remaining = MAX_SEARCHES - searchTimestamps.current.length;
    setSearchesRemaining(Math.max(0, remaining));
  }, []);

  /**
   * Check if rate limit has been exceeded
   * Removes old timestamps outside the 15-second window
   */
  const checkRateLimit = useCallback((): boolean => {
    const now = Date.now();
    // Remove timestamps older than the rate limit window
    searchTimestamps.current = searchTimestamps.current.filter(
      timestamp => now - timestamp < RATE_LIMIT_WINDOW_MS
    );
    
    // Update the counter
    updateSearchesRemaining();
    
    // Check if we've exceeded the limit
    return searchTimestamps.current.length >= MAX_SEARCHES;
  }, [updateSearchesRemaining]);

  /**
   * Trigger lockout for 5 seconds when rate limit is exceeded
   */
  const triggerLockout = useCallback(() => {
    setIsLocked(true);
    setLockoutCountdown(5);
    setSearchesRemaining(0);
    
    // Start countdown interval
    countdownInterval.current = setInterval(() => {
      setLockoutCountdown(prev => {
        if (prev <= 1) {
          if (countdownInterval.current) {
            clearInterval(countdownInterval.current);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    // Set lockout timer
    lockoutTimer.current = setTimeout(() => {
      setIsLocked(false);
      setLockoutCountdown(0);
      if (countdownInterval.current) {
        clearInterval(countdownInterval.current);
      }
      // Reset counter after lockout
      updateSearchesRemaining();
    }, LOCKOUT_DURATION_MS);
  }, [updateSearchesRemaining]);

  /**
   * Record a search attempt for rate limiting
   */
  const recordSearch = useCallback(() => {
    searchTimestamps.current.push(Date.now());
    
    // Check if we've hit the rate limit
    if (checkRateLimit()) {
      triggerLockout();
    }
  }, [checkRateLimit, triggerLockout]);

  // Initialize the autocomplete when places library is loaded
  useEffect(() => {
    if (!places || !inputRef.current) return;

    const options = {
      fields: ['geometry', 'name', 'formatted_address'],
      componentRestrictions: { country: 'us' },
      types: ['geocode']
    };

    // Create autocomplete widget
    setPlaceAutocomplete(new places.Autocomplete(inputRef.current, options));
    
    // Create autocomplete service for monitoring API calls
    autocompleteService.current = new places.AutocompleteService();
  }, [places]);

  // Set up place selection listener
  useEffect(() => {
    if (!placeAutocomplete) return;

    const listener = placeAutocomplete.addListener('place_changed', () => {
      // Don't process if locked out
      if (isLocked) return;
      
      const place = placeAutocomplete.getPlace();
      onPlaceSelect(place);
    });

    return () => {
      if (listener) {
        google.maps.event.removeListener(listener);
      }
    };
  }, [onPlaceSelect, placeAutocomplete, isLocked]);

  /**
   * Trigger a manual autocomplete search and count it against rate limit
   * This mimics what Google Autocomplete widget does internally
   */
  const triggerAutocompleteSearch = useCallback((input: string) => {
    if (!autocompleteService.current || isLocked || input.length < 3) return;
    
    // Make API call to Google Places Autocomplete
    autocompleteService.current.getPlacePredictions(
      {
        input,
        componentRestrictions: { country: 'us' },
        types: ['geocode']
      },
      (predictions, status) => {
        // Count this as a search regardless of success/failure
        // because it consumed an API quota
        if (status === google.maps.places.PlacesServiceStatus.OK || 
            status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
          recordSearch();
        }
      }
    );
  }, [isLocked, recordSearch]);

  /**
   * Handle input changes with debouncing
   * Debounce determines when to ping Google autocomplete for suggestions
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    
    // Don't allow changes if locked
    if (isLocked) {
      return;
    }
    
    if (onChange) {
      onChange(newValue);
    }
    
    // Clear previous debounce timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    // Debounce the autocomplete API call
    if (newValue.length >= 3) {
      debounceTimer.current = setTimeout(() => {
        // Trigger autocomplete search after debounce period
        triggerAutocompleteSearch(newValue);
      }, DEBOUNCE_MS);
    }
  };

  // Real-time counter update: Update counter every second to account for expired timestamps
  useEffect(() => {
    if (SHOW_DEBUG_COUNTER) {
      updateCounterInterval.current = setInterval(() => {
        updateSearchesRemaining();
      }, 1000); // Update every second
    }
    
    return () => {
      if (updateCounterInterval.current) {
        clearInterval(updateCounterInterval.current);
      }
    };
  }, [updateSearchesRemaining]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      if (lockoutTimer.current) {
        clearTimeout(lockoutTimer.current);
      }
      if (countdownInterval.current) {
        clearInterval(countdownInterval.current);
      }
      if (updateCounterInterval.current) {
        clearInterval(updateCounterInterval.current);
      }
    };
  }, []);

  /**
   * Get color for the counter based on searches remaining
   */
  const getCounterColor = () => {
    if (searchesRemaining <= 0) return 'text-destructive';
    if (searchesRemaining <= 3) return 'text-orange-500';
    if (searchesRemaining <= 5) return 'text-yellow-500';
    return 'text-green-600';
  };

  return (
    <div className="relative">
      {/* Debug counter - Toggle visibility with SHOW_DEBUG_COUNTER constant */}
      {SHOW_DEBUG_COUNTER && (
        <div className="absolute bottom-full right-0 mb-1 text-xs font-mono font-semibold z-50">
          <span className={getCounterColor()}>
            {searchesRemaining}/{MAX_SEARCHES} searches left
          </span>
          <span className="text-muted-foreground ml-2">
            (15s window)
          </span>
        </div>
      )}
      
      <div className={`autocomplete-container ${className}`}>
        <input 
          ref={inputRef} 
          placeholder={placeholder}
          value={value}
          onChange={handleInputChange}
          disabled={isLocked}
          className={`w-full h-10 pl-9 pr-3 py-2 border border-input bg-background text-foreground text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
        />
      </div>
      
      {isLocked && (
        <div className="absolute top-full left-0 mt-1 text-xs text-destructive font-medium">
          Rate limit exceeded. Try again in {lockoutCountdown}s
        </div>
      )}
    </div>
  );
};

export default PlaceAutocomplete;
