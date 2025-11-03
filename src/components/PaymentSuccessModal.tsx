import { useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  amount: number
  tripName?: string
  redirectTo?: string
}

export default function PaymentSuccessModal({ open, onOpenChange, amount, tripName, redirectTo }: Props) {
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => {
        onOpenChange(false)
        if (redirectTo) window.location.href = redirectTo
      }, 2500)
      return () => clearTimeout(t)
    }
  }, [open, onOpenChange, redirectTo])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">Payment Successful</DialogTitle>
        </DialogHeader>
        <Card>
          <CardContent className="text-center">
            <div className="text-lg">Thank you — your payment of</div>
            <div className="text-3xl font-bold text-primary my-2">${amount.toFixed(2)}</div>
            {tripName && <div className="text-sm text-muted-foreground mb-4">for {tripName}</div>}
            <div className="flex justify-center">
              <Button onClick={() => { onOpenChange(false); if (redirectTo) window.location.href = redirectTo }} className="bg-black text-gold">Go to trip</Button>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  )
}
