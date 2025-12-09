import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { profileService, Profile } from '@/lib/profileService'
import { ratingService } from '@/lib/ratingService'
import { useAuth } from '@/hooks/useAuth'
import { ArrowLeft, Mail, User, Star, Edit2, X, Check } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/hooks/use-toast'

const getInitials = (first?: string | null, last?: string | null) => {
  const firstInitial = first?.charAt(0) ?? ''
  const lastInitial = last?.charAt(0) ?? ''
  const initials = `${firstInitial}${lastInitial}`.trim()
  return initials ? initials.toUpperCase() : 'U'
}

const buildDisplayName = (profile: Profile | null) => {
  if (!profile) return 'Unknown Rider'
  const parts = [profile.first_name, profile.last_name].filter(Boolean)
  if (parts.length === 0) {
    return profile.email ?? 'Unknown Rider'
  }
  return parts.join(' ')
}

export default function ViewProfile() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ratings, setRatings] = useState<any[]>([])
  const [averageRating, setAverageRating] = useState({ average: 0, count: 0 })
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editRating, setEditRating] = useState(0)
  const [editComment, setEditComment] = useState('')
  const [editLoading, setEditLoading] = useState(false)

  useEffect(() => {
    if (!id) {
      setError('Missing profile identifier.')
      setLoading(false)
      return
    }

    let active = true
    const fetchProfile = async () => {
      setLoading(true)
      setError(null)

      const { data, error } = await profileService.getProfile(id)
      if (!active) return

      if (error) {
        const message = error.message.includes('JWT')
          ? 'You must be signed in to view profiles.'
          : error.message || 'Unable to load profile.'
        setError(message)
        setProfile(null)
      } else if (!data) {
        setError('Profile not found.')
        setProfile(null)
      } else {
        setProfile(data)
      }
      setLoading(false)
    }

    fetchProfile()
    return () => {
      active = false
    }
  }, [id])

  // Fetch ratings for the user (driver or rider)
  useEffect(() => {
    if (!profile?.id) return

    const fetchRatings = async () => {
      try {
        const [reviews, avgRating] = await Promise.all([
          ratingService.getDriverReviews(profile.id),
          ratingService.getDriverAverageRating(profile.id)
        ])
        setRatings(reviews)
        setAverageRating(avgRating)
      } catch (err) {
        console.error('Failed to fetch ratings:', err)
      }
    }

    fetchRatings()
  }, [profile?.id])

  const startEdit = (rating: any) => {
    setEditingId(rating.id)
    setEditRating(rating.rating)
    setEditComment(rating.comment || '')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditRating(0)
    setEditComment('')
  }

  const saveEdit = async (ratingId: number) => {
    if (editRating === 0) {
      toast({
        title: 'Error',
        description: 'Please select a rating',
        variant: 'destructive'
      })
      return
    }

    setEditLoading(true)
    try {
      await ratingService.updateRating(ratingId, editRating, editComment.trim() || undefined)
      setRatings(ratings.map(r => 
        r.id === ratingId 
          ? { ...r, rating: editRating, comment: editComment.trim() || null }
          : r
      ))
      setEditingId(null)
      toast({
        title: 'Success',
        description: 'Rating updated successfully'
      })
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err?.message || 'Failed to update rating',
        variant: 'destructive'
      })
    } finally {
      setEditLoading(false)
    }
  }

  const displayName = useMemo(() => buildDisplayName(profile), [profile])
  const initials = useMemo(() => getInitials(profile?.first_name, profile?.last_name), [profile])

  return (
    <div className="min-h-screen bg-muted/40 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div className="text-sm text-muted-foreground">
            Viewing {profile?.role === 'driver' ? 'driver' : 'rider'} profile
          </div>
        </div>

        <Card>
          <CardContent className="p-8 flex flex-col items-center text-center space-y-4">
            {loading ? (
              <>
                <Skeleton className="h-24 w-24 rounded-full" />
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-56" />
              </>
            ) : (
              <>
                <Avatar className="h-24 w-24">
                  <AvatarImage src={profile?.avatar_url || undefined} alt={displayName} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xl">
                    {initials}
                  </AvatarFallback>
                </Avatar>

                <div>
                  <h1 className="text-2xl font-semibold flex items-center justify-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    {displayName}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {profile?.email || 'No Purdue email on file'}
                  </p>
                </div>

                {(!profile?.first_name || !profile?.last_name || !profile?.email) && (
                  <Alert variant="default" className="max-w-md">
                    <AlertTitle>Incomplete profile</AlertTitle>
                    <AlertDescription>
                      Some details are missing. Encourage this rider to update their profile for more information.
                    </AlertDescription>
                  </Alert>
                )}

                {profile?.bio && (
                  <div className="max-w-2xl text-left">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      About
                    </h2>
                    <p className="mt-2 text-sm leading-6">
                      {profile.bio}
                    </p>
                  </div>
                )}

                {averageRating.count > 0 && (
                  <div className="max-w-2xl w-full text-left">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                      Ratings & Reviews
                    </h2>
                    
                    {/* Average Rating Summary */}
                    <div className="flex items-center gap-4 mb-6 p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                          {averageRating.average}
                        </span>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              size={18}
                              className={`${
                                star <= Math.round(averageRating.average)
                                  ? 'fill-yellow-400 stroke-yellow-400'
                                  : 'stroke-gray-300 text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Based on {averageRating.count} rating{averageRating.count !== 1 ? 's' : ''}
                      </div>
                    </div>

                    {/* Recent Reviews */}
                    {ratings.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="text-sm font-medium text-foreground">Recent Reviews</h3>
                        {ratings.slice(0, 5).map((review) => (
                          <div key={review.id} className="p-3 border rounded-lg bg-card space-y-2">
                            {editingId === review.id ? (
                              // Edit mode
                              <>
                                <div className="space-y-2">
                                  <div className="flex gap-2 justify-center py-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <button
                                        key={star}
                                        onClick={() => setEditRating(star)}
                                        className="transition-transform hover:scale-110 focus:outline-none"
                                      >
                                        <Star
                                          size={20}
                                          className={`${
                                            star <= editRating
                                              ? 'fill-yellow-400 stroke-yellow-400'
                                              : 'stroke-gray-300 text-gray-300'
                                          }`}
                                        />
                                      </button>
                                    ))}
                                  </div>
                                  <Textarea
                                    placeholder="Update your review..."
                                    value={editComment}
                                    onChange={(e) => setEditComment(e.target.value)}
                                    maxLength={500}
                                    className="resize-none"
                                    rows={2}
                                  />
                                  <p className="text-xs text-muted-foreground text-right">
                                    {editComment.length}/500
                                  </p>
                                </div>
                                <div className="flex gap-2 justify-end">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={cancelEdit}
                                    disabled={editLoading}
                                  >
                                    <X size={14} className="mr-1" />
                                    Cancel
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => saveEdit(review.id)}
                                    disabled={editLoading}
                                    className="bg-blue-600 hover:bg-blue-700"
                                  >
                                    <Check size={14} className="mr-1" />
                                    Save
                                  </Button>
                                </div>
                              </>
                            ) : (
                              // View mode
                              <>
                                <div className="flex items-center justify-between">
                                  <div className="flex gap-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <Star
                                        key={star}
                                        size={14}
                                        className={`${
                                          star <= review.rating
                                            ? 'fill-yellow-400 stroke-yellow-400'
                                            : 'stroke-gray-300 text-gray-300'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">
                                      {new Date(review.created_at).toLocaleDateString()}
                                    </span>
                                    {user?.id === review.rider_id && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => startEdit(review)}
                                        className="h-6 w-6 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                        title="Edit rating"
                                      >
                                        <Edit2 size={14} />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                                {review.comment && (
                                  <p className="text-sm text-foreground leading-relaxed">
                                    "{review.comment}"
                                  </p>
                                )}
                              </>
                            )}
                          </div>
                        ))}
                        {ratings.length > 5 && (
                          <p className="text-xs text-muted-foreground pt-2">
                            +{ratings.length - 5} more review{ratings.length - 5 !== 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 mt-4">
                  <Button onClick={() => navigate(-1)} variant="secondary">
                    Go Back
                  </Button>
                  {profile?.email && (
                    <Button variant="outline" onClick={() => window.open(`mailto:${profile.email}`, '_blank')}>
                      <Mail className="mr-2 h-4 w-4" />
                      Email {profile.first_name || 'Rider'}
                    </Button>
                  )}
                  {user?.id && id && user.id !== id && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant={isBlocked ? "outline" : "destructive"} 
                          disabled={blocking}
                        >
                          <Ban className="mr-2 h-4 w-4" />
                          {isBlocked ? 'Unblock User' : 'Block User'}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            {isBlocked ? 'Unblock this user?' : 'Block this user?'}
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            {isBlocked 
                              ? 'You will be able to see each other\'s profiles and rides again.'
                              : 'Blocking this user will prevent you from seeing each other\'s profiles, rides, or joining each other\'s rides. This action is mutual.'}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel disabled={blocking}>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={isBlocked ? handleUnblock : handleBlock}
                            disabled={blocking}
                            className={isBlocked ? '' : 'bg-destructive text-destructive-foreground hover:bg-destructive/90'}
                          >
                            {isBlocked ? 'Unblock' : 'Block'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive">
            <AlertTitle>Unable to load profile</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}
