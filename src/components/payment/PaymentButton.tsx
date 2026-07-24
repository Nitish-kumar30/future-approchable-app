import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import confetti from "canvas-confetti";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePricingCurrency } from "@/hooks/usePricingCurrency";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Loader2 } from "lucide-react";
import { loadRazorpayCheckout } from "@/lib/loadRazorpay";
import { isIOS } from "@/lib/platform";
import {
  formatInrPrice,
  formatUsdPrice,
  type PaymentCurrency,
} from "@/lib/coursePayment";

type PaymentButtonProps = {
  courseId: string;
  courseName: string;
  priceInrPaise?: number | null;
  priceUsdCents?: number | null;
  hasPaid: boolean;
  onPaid?: () => void;
  size?: "default" | "sm" | "lg" | "icon";
  adminEnroll?: {
    onEnroll: () => void;
    isEnrolling?: boolean;
  };
};

type Status = "idle" | "opening" | "confirming" | "success";

const SUPPORT_EMAIL = "ranbeer@gmail.com";

function fireConfetti(el: HTMLElement | null) {
  const origin = el
    ? (() => {
        const r = el.getBoundingClientRect();
        return {
          x: (r.left + r.width / 2) / window.innerWidth,
          y: (r.top + r.height / 2) / window.innerHeight,
        };
      })()
    : { x: 0.5, y: 0.6 };
  confetti({
    particleCount: 120,
    spread: 80,
    startVelocity: 45,
    origin,
    zIndex: 9999,
  });
}

export default function PaymentButton({
  courseId,
  courseName,
  priceInrPaise,
  priceUsdCents,
  hasPaid,
  onPaid,
  size = "lg",
  adminEnroll,
}: PaymentButtonProps) {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const {
    currency,
    coursePriceLabel,
    isLoading: isCurrencyLoading,
  } = usePricingCurrency();
  const { toast } = useToast();
  const [status, setStatus] = useState<Status>("idle");
  const [activeCurrency, setActiveCurrency] = useState<PaymentCurrency | null>(
    null,
  );
  const buttonRef = useRef<HTMLButtonElement>(null);

  const course = {
    price_inr_paise: priceInrPaise,
    price_usd_cents: priceUsdCents,
  };
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

  const showError = (err: unknown) => {
    const message =
      err instanceof Error
        ? err.message
        : String(err ?? "Something went wrong");
    toast({
      title: "Payment could not be confirmed",
      description: `Something went wrong: ${message}. Please take a screenshot of this screen and email it to ${SUPPORT_EMAIL} so we can help.`,
      variant: "destructive",
      duration: 10000,
    });
  };

  const openCheckout = async (currency?: PaymentCurrency) => {
    if (!user) {
      navigate("/auth");
      return;
    }

    setActiveCurrency(currency ?? null);
    setStatus("opening");
    try {
      await loadRazorpayCheckout();

      const body: { course_id: string; currency?: PaymentCurrency } = {
        course_id: courseId,
      };
      if (currency) body.currency = currency;

      const { data: orderData, error: orderError } =
        await supabase.functions.invoke("create-razorpay-order", { body });

      if (orderError || orderData?.error) {
        throw new Error(
          orderData?.error || orderError?.message || "Failed to create order",
        );
      }

      const rzp = new window.Razorpay({
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Approachable",
        description: orderData.course_name || courseName,
        order_id: orderData.razorpay_order_id,
        prefill: {
          email: user.email,
          name: user.user_metadata?.full_name as string | undefined,
        },
        // iOS Safari can't open UPI app deep links (Intent flow), so fall back to
        // UPI Collect (VPA entry) there. Android keeps the app-icon Intent flow.
        ...(isIOS() && orderData.currency === "INR"
          ? {
              config: {
                display: { hide: [{ method: "upi", flows: ["intent"] }] },
              },
            }
          : {}),
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          setStatus("confirming");
          try {
            const { data: verifyData, error: verifyError } =
              await supabase.functions.invoke("verify-razorpay-payment", {
                body: {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                },
              });

            if (verifyError || verifyData?.error) {
              throw new Error(
                verifyData?.error ||
                  verifyError?.message ||
                  "Verification failed",
              );
            }

            setStatus("success");
            fireConfetti(buttonRef.current);
            toast({
              title: "Payment successful",
              description: "You're enrolled in the course.",
            });
            setTimeout(() => {
              onPaid?.();
              setStatus("idle");
              setActiveCurrency(null);
            }, 1600);
          } catch (err) {
            showError(err);
            setStatus("idle");
            setActiveCurrency(null);
          }
        },
        modal: {
          ondismiss: () => {
            // Only reset if the user closed the modal before paying
            setStatus((s) => {
              if (s === "confirming" || s === "success") return s;
              setActiveCurrency(null);
              return "idle";
            });
          },
        },
      });

      // Payment failures inside Razorpay (wrong PIN, declined, cancelled) would
      // otherwise leave the button stuck on "Processing…" with no feedback.
      rzp.on("payment.failed", (response) => {
        showError(
          new Error(
            response?.error?.description || "Payment failed. Please try again.",
          ),
        );
        setStatus("idle");
        setActiveCurrency(null);
      });

      rzp.open();
    } catch (err) {
      showError(err);
      setStatus("idle");
      setActiveCurrency(null);
    }
  };

  const isBusy = status !== "idle" || isCurrencyLoading;

  const renderLabel = (fallback: string, currency?: PaymentCurrency) => {
    const matchesCurrency = currency ? activeCurrency === currency : true;
    if (matchesCurrency) {
      if (status === "opening")
        return (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing…
          </>
        );
      if (status === "confirming")
        return (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Confirming your access…
          </>
        );
      if (status === "success")
        return (
          <>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Enrolled
          </>
        );
    }
    return fallback;
  };

  if (isAdmin) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-xs text-muted-foreground">
          Admin: test both currencies
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {hasInr && (
            <Button
              size={size}
              onClick={() => openCheckout("INR")}
              disabled={isBusy || adminEnroll?.isEnrolling}
            >
              {renderLabel(`Pay ${formatInrPrice(priceInrPaise!)}`, "INR")}
            </Button>
          )}
          {hasUsd && (
            <Button
              size={size}
              variant="secondary"
              onClick={() => openCheckout("USD")}
              disabled={isBusy || adminEnroll?.isEnrolling}
            >
              {renderLabel(`Pay ${formatUsdPrice(priceUsdCents!)}`, "USD")}
            </Button>
          )}
          {adminEnroll && (
            <Button
              size={size}
              variant="outline"
              onClick={adminEnroll.onEnroll}
              disabled={isBusy || adminEnroll.isEnrolling}
            >
              {adminEnroll.isEnrolling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enrolling...
                </>
              ) : (
                "Enroll as admin"
              )}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        ref={buttonRef}
        size={size}
        onClick={() => openCheckout()}
        disabled={isBusy || !label}
      >
        {isCurrencyLoading && status === "idle" ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading…
          </>
        ) : (
          renderLabel(`Pay ${label}`)
        )}
      </Button>
    </div>
  );
}
