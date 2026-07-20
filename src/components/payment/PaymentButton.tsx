import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePricingCurrency } from '@/hooks/usePricingCurrency';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { loadRazorpayCheckout } from '@/lib/loadRazorpay';
import {
  formatInrPrice,
  formatUsdPrice,
  type PaymentCurrency,
} from '@/lib/coursePayment';

type PaymentButtonProps = {
  courseId: string;
  courseName: string;
  priceInrPaise?: number | null;
  priceUsdCents?: number | null;
  hasPaid: boolean;
  onPaid?: () => void;
  size?: 'default' | 'sm' | 'lg' | 'icon';
};

export default function PaymentButton({
  courseId,
  courseName,
  priceInrPaise,
  priceUsdCents,
  hasPaid,
  onPaid,
  size = 'lg',
}: PaymentButtonProps) {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { coursePriceLabel, isLoading: isCurrencyLoading } = usePricingCurrency();
  const { toast } = useToast();
  const [payingCurrency, setPayingCurrency] = useState<PaymentCurrency | null>(null);

  const course = { price_inr_paise: priceInrPaise, price_usd_cents: priceUsdCents };
  const label = coursePriceLabel(course);
  const hasInr = (priceInrPaise ?? 0) > 0;
  const hasUsd = (priceUsdCents ?? 0) > 0;

  if (hasPaid) {
    return (
      <Badge variant="secondary" className="text-base px-4 py-2">
        <CheckCircle2 className="h-4 w-4 mr-2" /> Paid
      </Badge>
    );
  }

  const openCheckout = async (currency?: PaymentCurrency) => {
    if (!user) {
      navigate('/auth');
      return;
    }

    setPayingCurrency(currency ?? null);
    try {
      await loadRazorpayCheckout();

      const body: { course_id: string; currency?: PaymentCurrency } = { course_id: courseId };
      if (currency) {
        body.currency = currency;
      }

      const { data: orderData, error: orderError } = await supabase.functions.invoke(
        'create-razorpay-order',
        { body },
      );

      if (orderError || orderData?.error) {
        throw new Error(orderData?.error || orderError?.message || 'Failed to create order');
      }

      const rzp = new window.Razorpay({
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Approachable',
        description: orderData.course_name || courseName,
        order_id: orderData.razorpay_order_id,
        prefill: {
          email: user.email,
          name: user.user_metadata?.full_name as string | undefined,
        },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
            'verify-razorpay-payment',
            {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              },
            },
          );

          if (verifyError || verifyData?.error) {
            toast({
              title: 'Payment verification failed',
              description: verifyData?.error || verifyError?.message,
              variant: 'destructive',
            });
            return;
          }

          toast({
            title: 'Payment successful',
            description: "You're enrolled in the course.",
          });
          onPaid?.();
        },
        modal: {
          ondismiss: () => setPayingCurrency(null),
        },
      });

      rzp.open();
    } catch (err) {
      toast({
        title: 'Payment failed',
        description: err instanceof Error ? err.message : 'Something went wrong',
        variant: 'destructive',
      });
    } finally {
      setPayingCurrency(null);
    }
  };

  const isBusy = payingCurrency !== null || isCurrencyLoading;

  if (isAdmin) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-xs text-muted-foreground">Admin: test both currencies</p>
        <div className="flex flex-wrap gap-2">
          {hasInr && (
            <Button
              size={size}
              onClick={() => openCheckout('INR')}
              disabled={isBusy}
            >
              {payingCurrency === 'INR' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                `Pay ${formatInrPrice(priceInrPaise!)}`
              )}
            </Button>
          )}
          {hasUsd && (
            <Button
              size={size}
              variant="secondary"
              onClick={() => openCheckout('USD')}
              disabled={isBusy}
            >
              {payingCurrency === 'USD' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                `Pay ${formatUsdPrice(priceUsdCents!)}`
              )}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <Button size={size} onClick={() => openCheckout()} disabled={isBusy || !label}>
      {isBusy ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {payingCurrency !== null ? 'Processing...' : 'Loading...'}
        </>
      ) : (
        `Pay ${label}`
      )}
    </Button>
  );
}
