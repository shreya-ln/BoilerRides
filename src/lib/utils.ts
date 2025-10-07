import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Dynamically load Google Maps JS API once
let googleMapsLoadingPromise: Promise<void> | null = null
export function loadGoogleMaps(apiKey: string): Promise<void> {
  if ((window as any).google?.maps) return Promise.resolve()
  if (googleMapsLoadingPromise) return googleMapsLoadingPromise
  googleMapsLoadingPromise = new Promise<void>((resolve, reject) => {
    if (!apiKey) {
      reject(new Error('Missing Google Maps API key'))
      return
    }
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&v=quarterly`
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Google Maps'))
    document.head.appendChild(script)
  })
  return googleMapsLoadingPromise
}
