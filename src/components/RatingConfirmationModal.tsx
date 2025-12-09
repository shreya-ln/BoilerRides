import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Star, CheckCircle } from 'lucide-react'

interface RatingConfirmationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  driverName: string
  rating: number
  redirectTo?: () => void
}

export default function RatingConfirmationModal({
  open,
  onOpenChange,
  driverName,
  rating,
  redirectTo
}: RatingConfirmationModalProps) {
  const [isAutoClosing, setIsAutoClosing] = useState(false)

  useEffect(() => {
    if (open) {
      setIsAutoClosing(true)
      const timer = setTimeout(() => {
        onOpenChange(false)
        if (redirectTo) {
          redirectTo()
        }
      }, 3500) // Auto-close after 3.5 seconds

      return () => clearTimeout(timer)
    }
  }, [open])

  const ratingLabels = {
    1: 'Poor',
    2: 'Fair',
    3: 'Good',
    4: 'Very Good',
    5: 'Excellent'
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
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
                You rated {driverName}
              </p>
            </div>

            {/* Star rating display */}
            <div className="flex justify-center items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={24}
                  className={`${
                    star <= rating
                      ? 'fill-yellow-400 stroke-yellow-400'
                      : 'stroke-gray-300 text-gray-300'
                  }`}
                />
              ))}
            </div>

            <div className="text-center">
              <p className="font-medium text-primary">
                {rating} star{rating !== 1 ? 's' : ''} - {ratingLabels[rating as keyof typeof ratingLabels]}
              </p>
            </div>

            {/* Auto-close info */}
            <div className="text-xs text-muted-foreground text-center">
              {isAutoClosing && 'Closing automatically in a moment...'}
            </div>

            {/* Close button */}
            <Button
              onClick={() => onOpenChange(false)}
              className="w-full bg-gradient-primary hover:shadow-glow"
            >
              Done
            </Button>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  )
}
