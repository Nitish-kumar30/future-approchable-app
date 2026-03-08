import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import PublicHeader from '@/components/layout/PublicHeader';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { CheckCircle2, PartyPopper } from 'lucide-react';

const COHORT_OPTIONS = [
  'AI Fundamentals Cohort 1',
  'Vibe Coding Cohort 2',
  'No-code AI Agents Cohort 1',
];

const INTEREST_OPTIONS = [
  'AI Fundamentals',
  'Vibe Coding',
  'No-code AI Agents',
  'Prompt Engineering',
  'Other',
];

const registrationSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email is required'),
  whatsapp_number: z.string().min(5, 'WhatsApp number is required'),
  cohort: z.string().min(1, 'Please select a cohort'),
  interests: z.array(z.string()).min(1, 'Select at least one interest'),
  company: z.string().min(1, 'Company name is required'),
  other_interest: z.string().optional(),
  role: z.string().min(1, 'Role is required'),
  reason: z.string().min(10, 'Please tell us why you want to join (at least 10 characters)'),
  additional_info: z.string().optional(),
  fee_acknowledged: z.literal(true, {
    errorMap: () => ({ message: 'You must acknowledge the commitment fee' }),
  }),
});

type RegistrationForm = z.infer<typeof registrationSchema>;

export default function Registration() {
  const [submitted, setSubmitted] = useState(false);


  const form = useForm<RegistrationForm>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      name: '',
      email: '',
      whatsapp_number: '',
      cohort: '',
      interests: [],
      company: '',
      other_interest: '',
      role: '',
      reason: '',
      additional_info: '',
      fee_acknowledged: undefined,
    },
  });

  const onSubmit = (_data: RegistrationForm) => {
    setSubmitted(true);
    toast({
      title: 'Registration submitted!',
      description: "We'll review your application and get back to you soon.",
    });
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <PublicHeader hideAuth />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full text-center">
            <CardHeader>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Registration Submitted!</CardTitle>
              <CardDescription className="text-base">
                Thank you for registering. We'll review your application and get back to you soon via email or WhatsApp.
              </CardDescription>
            </CardHeader>
          </Card>
        </main>
        <Footer />
      </div>
    );
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

                {/* Interests */}
                <FormField
                  control={form.control}
                  name="interests"
                  render={() => (
                    <FormItem>
                      <FormLabel>What do you want to learn? *</FormLabel>
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
                      {form.watch('interests')?.includes('Other') && (
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
                        <Checkbox
                          checked={field.value === true}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="cursor-pointer font-medium">
                          Commitment fees (non-refundable) *
                        </FormLabel>
                        <p className="text-sm text-muted-foreground pt-1">
                          Course fee: Rs0/$0. Commitment fees: nominal.
                        </p>
                        <p className="text-sm text-muted-foreground">
                          In previous free cohorts, many registered but didn't show up. To ensure a serious, engaged learning experience for everyone, we now require a small commitment fee to reserve your seat.
                        </p>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" size="lg">
                  Submit Registration
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
