import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import PublicHeader from "@/components/layout/PublicHeader";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { CheckCircle2, PartyPopper } from "lucide-react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { COUNTRIES, INDIA_STATES, PRIORITY_COUNTRIES } from "@/lib/locations";

const COHORT_OPTIONS = ["Cohort 6: Claude AI July 23rd 7:30PM/10AM Eastern"];

const INTEREST_OPTIONS = ["Claude Overview", "Claude Code", "No-code AI Agents", "Claude Cowork", "Other"];

const registrationSchema = z
  .object({
    name: z.string().min(2, "Name is required"),
    email: z.string().email("Valid email is required"),
    whatsapp_number: z.string().min(5, "WhatsApp number is required"),
    country: z.string().min(1, "Please select your country"),
    state: z.string().optional(),
    cohort: z.string().min(1, "Please select a cohort"),
    interests: z.array(z.string()).min(1, "Select at least one interest"),
    capstone_office_hours: z.boolean().default(true),
    company: z.string().min(1, "Company name is required"),
    other_interest: z.string().optional(),
    role: z.string().min(1, "Role is required"),
    reason: z.string().min(1, "Please tell us why you want to join"),
    additional_info: z.string().optional(),
    fee_acknowledged: z.literal(true, {
      errorMap: () => ({ message: "You must acknowledge the commitment fee" }),
    }),
  })
  .superRefine((data, ctx) => {
    if (data.country === "India" && (!data.state || data.state.trim().length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["state"],
        message: "Please select your state",
      });
    }
  });

type RegistrationForm = z.infer<typeof registrationSchema>;

function ThankYouScreen() {
  const navigate = useNavigate();

  useEffect(() => {
    // Fire confetti
    import("canvas-confetti").then((mod) => {
      const confetti = mod.default;
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
      setTimeout(() => confetti({ particleCount: 100, spread: 100, origin: { y: 0.5 } }), 300);
    });

    // Load Google Analytics
    const gtagScript = document.createElement("script");
    gtagScript.async = true;
    gtagScript.src = "https://www.googletagmanager.com/gtag/js?id=G-XG391DQQCV";
    document.head.appendChild(gtagScript);

    const inlineScript = document.createElement("script");
    inlineScript.textContent = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-XG391DQQCV');
      gtag('event', 'conversion', {
        'event_category': 'Funnel',
        'event_label': 'Form Submitted',
        'value': 399,
        'currency': 'INR'
      });
    `;
    document.head.appendChild(inlineScript);

    // Redirect after 10 seconds
    const timer = setTimeout(() => {
      navigate("/on-demand");
    }, 10000);

    return () => {
      clearTimeout(timer);
      document.head.removeChild(gtagScript);
      document.head.removeChild(inlineScript);
    };
  }, [navigate]);

  const steps = [
    "Next steps for onboarding",
    "Payment link for commitment fee",
    "Access to your study group workspace",
    "Week 1 cohort materials and schedule",
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicHeader hideAuth />
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6 animate-fade-in">
          <div className="mx-auto flex h-16 w-16 items-center justify-center">
            <PartyPopper className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-primary">You're In!</h1>
          <Card>
            <CardContent className="pt-6 space-y-4">
              <p className="font-semibold text-lg">Welcome to the Approachable community!</p>
              <p className="text-muted-foreground">
                We'll email you within <span className="font-bold text-foreground">12 hours</span> with:
              </p>
              <ul className="text-left space-y-3 pt-2">
                {steps.map((step) => (
                  <li key={step} className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <p className="text-sm text-muted-foreground">You'll be redirected to on-demand courses shortly...</p>
          <Button
            onClick={() => navigate("/on-demand")}
            size="lg"
            className="mt-2 bg-accent text-accent-foreground hover:bg-accent/90"
          >
            Go to On-Demand Courses →
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function Registration() {
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<RegistrationForm>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      name: "",
      email: "",
      whatsapp_number: "",
      country: "",
      state: "",
      cohort: "",
      interests: [],
      capstone_office_hours: true,
      company: "",
      other_interest: "",
      role: "",
      reason: "",
      additional_info: "",
      fee_acknowledged: undefined,
    },
  });

  const onSubmit = async (data: RegistrationForm) => {
    setIsSubmitting(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("trigger-registration-webhook", {
        body: {
          name: data.name,
          email: data.email,
          whatsapp_number: data.whatsapp_number,
          country: data.country,
          state: data.country === "India" ? data.state : null,
          cohort: data.cohort,
          interests: data.interests,
          capstone_office_hours: data.capstone_office_hours,
          other_interest: data.other_interest || null,
          company: data.company,
          role: data.role,
          reason: data.reason,
          additional_info: data.additional_info || null,
        },
      });

      if (error) {
        toast({
          title: "Registration failed",
          description: "Something went wrong. Please try again.",
          variant: "destructive",
        });
        console.error("Registration error:", error);
        return;
      }

      setSubmitted(true);
    } catch (err) {
      toast({
        title: "Registration failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
      console.error("Registration error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCountry = form.watch("country");

  if (submitted) {
    return <ThankYouScreen />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicHeader hideAuth />
      <main className="flex-1 container max-w-2xl py-10 px-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Cohort Registration</CardTitle>
            <CardDescription>
              Fill out this form to register for a cohort. We'll review your application and get back to you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Name */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Your full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Email */}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="you@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* WhatsApp */}
                <FormField
                  control={form.control}
                  name="whatsapp_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>WhatsApp Number (with country code) *</FormLabel>
                      <FormControl>
                        <Input placeholder="+91 98765 43210" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Country */}
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country of Residence*</FormLabel>
                      <FormControl>
                        <SearchableSelect
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select your country"
                          searchPlaceholder="Search countries..."
                          groups={[
                            {
                              heading: "Popular",
                              items: PRIORITY_COUNTRIES,
                            },
                            {
                              heading: "All Countries",
                              items: COUNTRIES.filter((c) => !PRIORITY_COUNTRIES.includes(c)).sort((a, b) =>
                                a.localeCompare(b),
                              ),
                            },
                          ]}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* State (India only) */}
                {selectedCountry === "India" && (
                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State *</FormLabel>
                        <FormControl>
                          <SearchableSelect
                            value={field.value || ""}
                            onChange={field.onChange}
                            placeholder="Select your state"
                            searchPlaceholder="Search states..."
                            groups={[{ items: INDIA_STATES }]}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Cohort */}
                <FormField
                  control={form.control}
                  name="cohort"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Cohort *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a cohort" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {COHORT_OPTIONS.map((cohort) => (
                            <SelectItem key={cohort} value={cohort}>
                              {cohort}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Capstone Office Hours */}
                <FormField
                  control={form.control}
                  name="capstone_office_hours"
                  render={({ field }) => (
                    <FormItem className="flex items-start space-x-3 space-y-0 rounded-md border border-border p-4">
                      <FormControl>
                        <Checkbox checked={field.value === true} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="cursor-pointer font-medium">
                          Capstone Office Hours (Hands-on Support)
                        </FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Get hands-on support during office hours to help you complete your capstone project.
                        </p>
                      </div>
                    </FormItem>
                  )}
                />

                {/* Interests */}
                <FormField
                  control={form.control}
                  name="interests"
                  render={() => (
                    <FormItem>
                      <FormLabel>What do you want to learn? (select all that apply) *</FormLabel>
                      <div className="space-y-3 pt-1">
                        {INTEREST_OPTIONS.map((interest) => (
                          <FormField
                            key={interest}
                            control={form.control}
                            name="interests"
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(interest)}
                                    onCheckedChange={(checked) => {
                                      const updated = checked
                                        ? [...(field.value || []), interest]
                                        : (field.value || []).filter((v) => v !== interest);
                                      field.onChange(updated);
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal cursor-pointer">{interest}</FormLabel>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                      {form.watch("interests")?.includes("Other") && (
                        <FormField
                          control={form.control}
                          name="other_interest"
                          render={({ field }) => (
                            <FormItem className="pt-2">
                              <FormControl>
                                <Input placeholder="Please specify your interest" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Company */}
                <FormField
                  control={form.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Your company" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Role */}
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Product Manager, Developer" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Reason */}
                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Why do you want to join? *</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Tell us what you hope to learn and achieve..." rows={4} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Additional Info */}
                <FormField
                  control={form.control}
                  name="additional_info"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Anything else you'd like us to know?</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Optional" rows={3} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Fee Acknowledgment */}
                <FormField
                  control={form.control}
                  name="fee_acknowledged"
                  render={({ field }) => (
                    <FormItem className="flex items-start space-x-3 space-y-0 rounded-md border border-border p-4">
                      <FormControl>
                        <Checkbox checked={field.value === true} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="cursor-pointer font-medium">
                          I agree to the Commitment fee (non-refundable) *
                        </FormLabel>
                        <p className="text-sm text-muted-foreground pt-1">​</p>
                        <p className="text-sm text-muted-foreground">
                          In previous cohorts, many registered but didn't show up. To ensure a serious, engaged learning
                          experience for everyone, we now require a commitment fee to reserve your seat.
                        </p>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isSubmitting ? "Submitting..." : "Submit Registration"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
