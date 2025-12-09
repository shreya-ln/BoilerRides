"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isRideActive = isRideActive;
exports.normalizeRide = normalizeRide;
/**
 * Checks if a ride is active based on the special character prefix in origin
 * Active rides don't have the ~ prefix
 */
function isRideActive(ride) {
    const origin = ride.origin || ride.from || '';
    return !origin.startsWith('~');
}
/**
 * Strips the inactive prefix from origin for display
 */
function stripInactivePrefix(origin) {
    if (origin.startsWith('~')) {
        return origin.substring(1);
    }
    return origin;
}
function normalizeRide(ride) {
    const origin = ride.origin || ride.from || '';
    return {
        id: ride.id,
        origin: stripInactivePrefix(origin),
        destination: ride.destination || ride.to,
        rideDate: ride.ride_date || ride.date,
        rideTime: ride.ride_time || ride.time,
        seatsAvailable: ride.seats_available || ride.seatsAvailable || 0,
        totalSeats: ride.total_seats || ride.totalSeats || 0,
        price: Number(ride.price || 0),
        driverId: ride.driver_id || ride.driverId,
        specialMoment: ride.special_moment || ride.specialMoment,
        profiles: ride.profiles ? {
            firstName: ride.profiles.first_name || ride.profiles.firstName,
            lastName: ride.profiles.last_name || ride.profiles.lastName,
            avatarUrl: ride.profiles.avatar_url || ride.profiles.avatarUrl,
            email: ride.profiles.email
        } : undefined
    };
}
