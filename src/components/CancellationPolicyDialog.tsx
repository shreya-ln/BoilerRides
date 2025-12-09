import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

interface CancellationPolicyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  onCancel: () => void
  rideDate?: string
  rideTime?: string
  price?: number
  seats?: number
}

/**
 * Dialog component that displays cancellation policy and requires user confirmation
 * Shows the 24-hour cancellation rule and penalty information
 */
export default function CancellationPolicyDialog({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
  rideDate,
  rideTime,
  price = 0,
  seats = 1
}: CancellationPolicyDialogProps) {
  const totalCost = price * seats

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Cancellation Policy</DialogTitle>
          <DialogDescription>
            Please read and confirm you understand our cancellation policy before requesting to join this ride.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>24-Hour Cancellation Rule:</strong> If you cancel within 24 hours of the scheduled departure time, 
              you will be charged a 25% penalty fee unless there are riders on the waitlist who can fill your spot.
            </AlertDescription>
          </Alert>

          <div className="space-y-2 text-sm">
            <div className="flex items-start space-x-2">
              <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <strong>Early Cancellation:</strong> Cancel more than 24 hours before departure - No penalty
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <strong>Late Cancellation (within 24 hours):</strong> 25% penalty fee applies if no waitlist riders available
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <strong>Waitlist Protection:</strong> If someone on the waitlist takes your spot, no penalty is charged
              </div>
            </div>
          </div>

          {rideDate && rideTime && (
            <div className="pt-2 border-t">
              <p className="text-sm text-muted-foreground">
                <strong>Ride Details:</strong> {new Date(rideDate).toLocaleDateString()} at {rideTime}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                <strong>Total Cost:</strong> ${totalCost.toFixed(2)} ({seats} {seats === 1 ? 'seat' : 'seats'} × ${price.toFixed(2)})
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                <strong>Potential Late Cancellation Fee:</strong> ${(totalCost * 0.25).toFixed(2)} (25% of total)
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onConfirm} className="bg-gradient-primary hover:shadow-glow">
            I Understand & Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

