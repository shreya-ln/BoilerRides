import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Star, CheckCircle, AlertCircle } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

// Profanity filter - list of common inappropriate words
const PROFANITY_LIST = [
  'damn', 'hell', 'crap', 'ass', 'bastard', 'bitch', 'shit', 'fuck',
  'asshole', 'dickhead', 'dumbass', 'prick', 'twat', 'wanker',
  // Add more as needed - can be expanded
]

// Check if comment contains profanity
const containsProfanity = (text: string): boolean => {
  const lowerText = text.toLowerCase()
  return PROFANITY_LIST.some(word => lowerText.includes(word))
}

interface DriverRatingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  riderName: string
  riderAvatar?: string
  onSubmit: (rating: number, comment?: string) => Promise<void>
}

export default function DriverRatingModal({
  open,
  onOpenChange,
  riderName,
  riderAvatar,
  onSubmit
}: DriverRatingModalProps) {
  const [selectedRating, setSelectedRating] = useState<number>(0)
  const [hoveredRating, setHoveredRating] = useState<number>(0)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [submittedRating, setSubmittedRating] = useState<number>(0)
  const [commentError, setCommentError] = useState<string>('')

  const handleCommentChange = (text: string) => {
    setComment(text)
    setCommentError('')
  }

  const validateComment = (text: string): string => {
    const trimmed = text.trim()
    
    // Check if comment is too short (if provided)
    if (trimmed.length > 0 && trimmed.length < 10) {
      return 'Review must be at least 10 characters if provided'
    }
    
    // Check for profanity
    if (containsProfanity(trimmed)) {
      return 'Review contains inappropriate language. Please revise.'
    }
    
    return ''
  }

  const handleSubmit = async () => {
    if (selectedRating === 0) {
      toast({
        title: 'Rating required',
        description: 'Please select a star rating',
        variant: 'destructive'
      })
      return
    }

    // Validate comment if provided
    if (comment.trim()) {
      const error = validateComment(comment)
      if (error) {
        setCommentError(error)
        toast({
          title: 'Invalid review',
          description: error,
          variant: 'destructive'
        })
        return
      }
    }

    setLoading(true)
    try {
      await onSubmit(selectedRating, comment.trim() || undefined)
      // Show confirmation
      setSubmittedRating(selectedRating)
      setShowConfirmation(true)
      
      // Auto-close modal after confirmation
      setTimeout(() => {
        setShowConfirmation(false)
        setSelectedRating(0)
        setComment('')
        setHoveredRating(0)
        setCommentError('')
        onOpenChange(false)
      }, 3000)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to submit rating',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const ratingLabels = {
    1: 'Poor',
    2: 'Fair',
    3: 'Good',
    4: 'Very Good',
    5: 'Excellent'
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {!showConfirmation ? (
          <>
            <DialogHeader>
              <DialogTitle>Rate Your Rider</DialogTitle>
              <DialogDescription>
                How was your experience with {riderName}?
              </DialogDescription>
            </DialogHeader>

            <Card>
              <CardContent className="pt-6 space-y-6">
                {/* Rider info */}
                <div className="flex items-center gap-4">
                  {riderAvatar && (
                    <img
                      src={riderAvatar}
                      alt={riderName}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  )}
                  <div>
                    <p className="font-semibold text-foreground">{riderName}</p>
                    <p className="text-sm text-muted-foreground">Rate this rider</p>
                  </div>
                </div>

                {/* Star Rating */}
                <div className="space-y-3">
                  <Label>Rating</Label>
                  <div className="flex gap-3 justify-center py-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onMouseEnter={() => setHoveredRating(star)}
                        onMouseLeave={() => setHoveredRating(0)}
                        onClick={() => setSelectedRating(star)}
                        className="transition-transform hover:scale-110 focus:outline-none"
                      >
                        <Star
                          size={40}
                          className={`transition-colors ${
                            star <= (hoveredRating || selectedRating)
                              ? 'fill-yellow-400 stroke-yellow-400'
                              : 'stroke-gray-300 text-gray-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  
                  {selectedRating > 0 && (
                    <p className="text-center text-sm font-medium text-primary">
                      {selectedRating} star{selectedRating !== 1 ? 's' : ''} - {ratingLabels[selectedRating as keyof typeof ratingLabels]}
                    </p>
                  )}
                </div>

                {/* Comment */}
                <div className="space-y-2">
                  <Label htmlFor="comment">
                    Comment <span className="text-muted-foreground">(optional, minimum 10 characters)</span>
                  </Label>
                  <Textarea
                    id="comment"
                    placeholder="Share your experience (e.g., respectful, clean, ready on time)..."
                    value={comment}
                    onChange={(e) => handleCommentChange(e.target.value)}
                    maxLength={500}
                    className={`resize-none ${commentError ? 'border-red-500' : ''}`}
                    rows={3}
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      {comment.length}/500
                    </p>
                    {commentError && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle size={12} />
                        {commentError}
                      </p>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={loading}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={loading || selectedRating === 0}
                    className="flex-1 bg-gradient-primary hover:shadow-glow"
                  >
                    {loading ? 'Submitting...' : 'Submit Rating'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Thank You!</DialogTitle>
            </DialogHeader>

            <Card>
              <CardContent className="pt-6 space-y-6">
                {/* Success icon */}
                <div className="flex justify-center">
                  <div className="relative">
                    <div className="absolute inset-0 bg-emerald-200 rounded-full opacity-20 animate-pulse"></div>
                    <CheckCircle className="h-16 w-16 text-emerald-600 relative" />
                  </div>
                </div>

                {/* Success message */}
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-semibold text-foreground">Rating submitted</h3>
                  <p className="text-sm text-muted-foreground">
                    You rated {riderName}
                  </p>
                </div>

                {/* Star rating display */}
                <div className="flex justify-center items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={24}
                      className={`${
                        star <= submittedRating
                          ? 'fill-yellow-400 stroke-yellow-400'
                          : 'stroke-gray-300 text-gray-300'
                      }`}
                    />
                  ))}
                </div>

                <div className="text-center">
                  <p className="font-medium text-primary">
                    {submittedRating} star{submittedRating !== 1 ? 's' : ''} - {ratingLabels[submittedRating as keyof typeof ratingLabels]}
                  </p>
                </div>

                {/* Auto-close info */}
                <div className="text-xs text-muted-foreground text-center">
                  Closing automatically in a moment...
                </div>

                {/* Close button */}
                <Button
                  onClick={() => {
                    setShowConfirmation(false)
                    setSelectedRating(0)
                    setComment('')
                    setHoveredRating(0)
                    onOpenChange(false)
                  }}
                  className="w-full bg-gradient-primary hover:shadow-glow"
                >
                  Done
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
