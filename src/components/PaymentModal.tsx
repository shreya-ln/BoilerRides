import { useState, useEffect } from 'react'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'

interface PaymentModalProps {
  bookingId?: number
  defaultAmount: number
  // onSuccess now receives optional split info
  onSuccess?: (payload: { bookingId: number; amount: number; splitCount?: number; perPerson?: number }) => void
  trigger?: React.ReactNode
  // optional max split (e.g., max people to split among). If not provided, no upper cap other than 100.
  maxSplit?: number
}

export default function PaymentModal({ bookingId, defaultAmount, onSuccess, trigger, maxSplit = 10 }: PaymentModalProps) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState(String(defaultAmount.toFixed(2)))
  const [splitCount, setSplitCount] = useState<number>(1)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => { setAmount(String(defaultAmount.toFixed(2))); setSplitCount(1) }, [defaultAmount])

  const parsedAmount = Number(amount) || 0
  const perPerson = splitCount > 0 ? +(parsedAmount / splitCount) : parsedAmount

  const handleConfirm = async () => {
    const amt = Number(parseFloat(String(parsedAmount)).toFixed(2))
    if (isNaN(amt) || amt <= 0) {
      toast({ title: 'Invalid amount', description: 'Please enter a valid amount', variant: 'destructive' })
      return
    }
    if (splitCount < 1) {
      toast({ title: 'Invalid split', description: 'Split count must be at least 1', variant: 'destructive' })
      return
    }

    setLoading(true)
    // Mock processing delay
    await new Promise((r) => setTimeout(r, 900))
    setLoading(false)
    setOpen(false)
    toast({ title: 'Payment Successful', description: `You paid $${amt.toFixed(2)}`, variant: 'default' })
    if (onSuccess) onSuccess({ bookingId, amount: amt, splitCount, perPerson: Number(perPerson.toFixed(2)) })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button className="bg-gradient-primary">Pay</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Payment</DialogTitle>
        </DialogHeader>

        <Card>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label>Amount (total)</Label>
                <Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" />
              </div>

              <div>
                <Label>Split between</Label>
                <Input
                  type="number"
                  min={1}
                  max={maxSplit}
                  value={String(splitCount)}
                  onChange={(e) => setSplitCount(Math.max(1, Math.min(maxSplit, Number(e.target.value) || 1)))}
                />
                <div className="text-sm text-muted-foreground mt-1">Per person: <strong>${perPerson.toFixed(2)}</strong></div>
              </div>

              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setOpen(false)} className="mr-2">Cancel</Button>
                <Button onClick={handleConfirm} disabled={loading}>{loading ? 'Processing…' : 'Confirm Payment'}</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  )
}
