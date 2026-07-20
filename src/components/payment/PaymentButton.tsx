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
  const { user } = useAuth();
  const { coursePriceLabel, isLoading: isCurrencyLoading } = usePricingCurrency();
  const { toast } = useToast();
  const [isPaying, setIsPaying] = useState(false);

  const course = { price_inr_paise: priceInrPaise, price_usd_cents: priceUsdCents };
  const label = coursePriceLabel(course);

  if (hasPaid) {
    return (
      <Badge variant="secondary" className="text-base px-4 py-2">
        <CheckCircle2 className="h-4 w-4 mr-2" /> Paid
      </Badge>
    );
  }

  const handlePay = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    setIsPaying(true);
    try {
      await loadRazorpayCheckout();

      const { data: orderData, error: orderError } = await supabase.functions.invoke(
        'create-razorpay-order',
        { body: { course_id: courseId } },
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
          ondismiss: () => setIsPaying(false),
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
      setIsPaying(false);
    }
  };

  const isBusy = isPaying || isCurrencyLoading;

  return (
    <Button size={size} onClick={handlePay} disabled={isBusy || !label}>
      {isBusy ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {isPaying ? 'Processing...' : 'Loading...'}
        </>
      ) : (
        `Pay ${label}`
      )}
    </Button>
  );
}
