import { useEffect, useMemo, useState, type MouseEvent, type ReactNode } from "react";
import {
  Building2,
  ChevronDown,
  ChevronUp,
  Download,
  Loader2,
  Mail,
  MessageSquare,
  Newspaper,
  RefreshCw,
  Trash2,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  type BlogSubscriber,
  type ContactInquiry,
  type CorporateInquiry,
  type Inquiry,
  allInquiriesToCsv,
  blogSubscribersToCsv,
  deleteBlogSubscriber,
  deleteInquiry,
  enquiryTypeLabel,
  fetchInquiriesData,
  filterContactInquiries,
  filterCorporateInquiries,
  formatInquiryDate,
} from "@/lib/corporate-inquiries";

type InquiryTab = "contact" | "corporate" | "blog";

function DetailField({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm">{value}</dd>
    </div>
  );
}

function downloadCsvFile(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function DeleteConfirmButton({
  itemKey,
  label,
  deletingKey,
  onDelete,
  dialogTitle = "Delete submission?",
  dialogDescription,
}: {
  itemKey: string;
  label: string;
  deletingKey: string | null;
  onDelete: () => Promise<void>;
  dialogTitle?: string;
  dialogDescription?: string;
}) {
  const [open, setOpen] = useState(false);
  const isDeleting = deletingKey === itemKey;

  const handleConfirm = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    await onDelete();
    setOpen(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          title="Delete"
          disabled={Boolean(deletingKey)}
          onClick={(event) => event.stopPropagation()}
        >
          {isDeleting ? (
            <Loader2 className="h-4 w-4 animate-spin text-destructive" />
          ) : (
            <Trash2 className="h-4 w-4 text-destructive" />
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent onClick={(event) => event.stopPropagation()}>
        <AlertDialogHeader>
          <AlertDialogTitle>{dialogTitle}</AlertDialogTitle>
          <AlertDialogDescription>
            {dialogDescription ??
              `This will permanently delete the submission for ${label}. This action cannot be undone.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={isDeleting}>
            {isDeleting ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function DeleteInquiryButton({
  inquiry,
  label,
  deletingId,
  onDelete,
}: {
  inquiry: Inquiry;
  label: string;
  deletingId: string | null;
  onDelete: (inquiry: Inquiry) => Promise<void>;
}) {
  return (
    <DeleteConfirmButton
      itemKey={inquiry.id}
      label={label}
      deletingKey={deletingId}
      onDelete={() => onDelete(inquiry)}
    />
  );
}

function ContactInquiryCard({
  inquiry,
  index,
  isExpanded,
  deletingId,
  onToggle,
  onDelete,
}: {
  inquiry: ContactInquiry;
  index: number;
  isExpanded: boolean;
  deletingId: string | null;
  onToggle: () => void;
  onDelete: (inquiry: Inquiry) => Promise<void>;
}) {
  return (
    <Card className="border">
      <div
        className="flex items-center justify-between gap-4 p-4 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-start gap-4 min-w-0 flex-1 flex-wrap">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold">
            {index + 1}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <User className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="font-medium">{inquiry.name || "Unknown contact"}</span>
              <Badge variant="secondary">{enquiryTypeLabel(inquiry.enquiryType)}</Badge>
            </div>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
              {inquiry.organization && <span>{inquiry.organization}</span>}
              {inquiry.email && (
                <a
                  href={`mailto:${inquiry.email}`}
                  className="inline-flex items-center gap-1 hover:text-foreground"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Mail className="h-3.5 w-3.5" />
                  {inquiry.email}
                </a>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <DeleteInquiryButton
            inquiry={inquiry}
            label={inquiry.name || inquiry.email || "this contact"}
            deletingId={deletingId}
            onDelete={onDelete}
          />
          <time className="text-xs text-muted-foreground whitespace-nowrap" dateTime={inquiry.submittedAt}>
            {formatInquiryDate(inquiry.submittedAt)}
          </time>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="border-t px-4 pb-4 pt-3 space-y-4">
          <dl className="grid gap-4 sm:grid-cols-2">
            <DetailField label="Phone" value={inquiry.phone} />
            <DetailField label="Organization" value={inquiry.organization} />
            <DetailField label="Enquiry type" value={enquiryTypeLabel(inquiry.enquiryType)} />
          </dl>

          {inquiry.message && (
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                <MessageSquare className="h-3.5 w-3.5" />
                Message
              </div>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{inquiry.message}</p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function CorporateInquiryCard({
  inquiry,
  index,
  isExpanded,
  deletingId,
  onToggle,
  onDelete,
}: {
  inquiry: CorporateInquiry;
  index: number;
  isExpanded: boolean;
  deletingId: string | null;
  onToggle: () => void;
  onDelete: (inquiry: Inquiry) => Promise<void>;
}) {
  return (
    <Card className="border">
      <div
        className="flex items-center justify-between gap-4 p-4 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-start gap-4 min-w-0 flex-1 flex-wrap">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold">
            {index + 1}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="font-medium">{inquiry.company || "Unknown company"}</span>
              <Badge variant="secondary">Team Training</Badge>
            </div>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
              {inquiry.contactName && <span>{inquiry.contactName}</span>}
              {inquiry.email && (
                <a
                  href={`mailto:${inquiry.email}`}
                  className="inline-flex items-center gap-1 hover:text-foreground"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Mail className="h-3.5 w-3.5" />
                  {inquiry.email}
                </a>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <DeleteInquiryButton
            inquiry={inquiry}
            label={inquiry.company || inquiry.contactName || "this inquiry"}
            deletingId={deletingId}
            onDelete={onDelete}
          />
          <time className="text-xs text-muted-foreground whitespace-nowrap" dateTime={inquiry.submittedAt}>
            {formatInquiryDate(inquiry.submittedAt)}
          </time>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="border-t px-4 pb-4 pt-3 space-y-4">
          <dl className="grid gap-4 sm:grid-cols-2">
            <DetailField label="Phone" value={inquiry.phone} />
            <DetailField label="Team size" value={inquiry.teamSize} />
            <DetailField label="Industry" value={inquiry.industry} />
            <DetailField label="Preferred timing" value={inquiry.timing} />
          </dl>

          {(inquiry.tiers ?? []).length > 0 && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Tiers to include
              </div>
              <div className="flex flex-wrap gap-2">
                {(inquiry.tiers ?? []).map((tier) => (
                  <Badge key={tier} variant="secondary">
                    {tier}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {inquiry.requirements && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Requirements
              </div>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{inquiry.requirements}</p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function InquiryList({
  emptyMessage,
  children,
}: {
  emptyMessage: string;
  children: ReactNode;
}) {
  const childCount = Array.isArray(children) ? children.length : children ? 1 : 0;

  if (childCount === 0) {
    return <p className="text-center py-8 text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <>
      <p className="text-sm text-muted-foreground mb-4">
        {childCount} submission{childCount !== 1 ? "s" : ""}
      </p>
      <div className="space-y-3">{children}</div>
    </>
  );
}

function BlogSubscriberRow({
  subscriber,
  index,
  deletingEmail,
  onDelete,
}: {
  subscriber: BlogSubscriber;
  index: number;
  deletingEmail: string | null;
  onDelete: (email: string) => Promise<void>;
}) {
  return (
    <Card className="border">
      <div className="flex items-center justify-between gap-4 p-4">
        <div className="flex items-start gap-4 min-w-0 flex-1">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold">
            {index + 1}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Newspaper className="h-4 w-4 text-muted-foreground shrink-0" />
              <a
                href={`mailto:${subscriber.email}`}
                className="font-medium inline-flex items-center gap-1 hover:text-primary"
              >
                <Mail className="h-3.5 w-3.5" />
                {subscriber.email}
              </a>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <DeleteConfirmButton
            itemKey={subscriber.email}
            label={subscriber.email}
            deletingKey={deletingEmail}
            onDelete={() => onDelete(subscriber.email)}
            dialogTitle="Delete subscriber?"
            dialogDescription={`This will permanently remove ${subscriber.email} from the blog subscriber list. This action cannot be undone.`}
          />
          <time className="text-xs text-muted-foreground whitespace-nowrap" dateTime={subscriber.subscribedAt}>
            {formatInquiryDate(subscriber.subscribedAt)}
          </time>
        </div>
      </div>
    </Card>
  );
}

export default function InquiriesAdminTab() {
  const { toast } = useToast();
  const [contactInquiries, setContactInquiries] = useState<ContactInquiry[]>([]);
  const [corporateInquiries, setCorporateInquiries] = useState<CorporateInquiry[]>([]);
  const [blogSubscribers, setBlogSubscribers] = useState<BlogSubscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingEmail, setDeletingEmail] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<InquiryTab>("contact");

  const totalInquiries = contactInquiries.length + corporateInquiries.length;
  const allInquiries = useMemo(
    () => [...contactInquiries, ...corporateInquiries],
    [contactInquiries, corporateInquiries],
  );

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchInquiriesData();
      setContactInquiries(filterContactInquiries(data.inquiries));
      setCorporateInquiries(filterCorporateInquiries(data.inquiries));
      setBlogSubscribers(data.subscribers);
    } catch (err) {
      toast({
        title: "Failed to load inquiries",
        description: err instanceof Error ? err.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (inquiry: Inquiry) => {
    setDeletingId(inquiry.id);
    try {
      await deleteInquiry(inquiry.id, inquiry.formType);
      setContactInquiries((current) => current.filter((item) => item.id !== inquiry.id));
      setCorporateInquiries((current) => current.filter((item) => item.id !== inquiry.id));
      if (expandedId === inquiry.id) {
        setExpandedId(null);
      }
      toast({
        title: "Submission deleted",
        description: "The inquiry was removed from storage.",
      });
    } catch (err) {
      toast({
        title: "Failed to delete submission",
        description: err instanceof Error ? err.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteSubscriber = async (email: string) => {
    setDeletingEmail(email);
    try {
      await deleteBlogSubscriber(email);
      setBlogSubscribers((current) => current.filter((item) => item.email !== email));
      toast({
        title: "Subscriber deleted",
        description: "The subscriber was removed from storage.",
      });
    } catch (err) {
      toast({
        title: "Failed to delete subscriber",
        description: err instanceof Error ? err.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setDeletingEmail(null);
    }
  };

  const downloadCsv = () => {
    if (activeTab === "blog") {
      downloadCsvFile(blogSubscribersToCsv(blogSubscribers), "blog-subscribers.csv");
      return;
    }
    downloadCsvFile(allInquiriesToCsv(allInquiries), "inquiries.csv");
  };

  const csvDisabled =
    activeTab === "blog" ? blogSubscribers.length === 0 : totalInquiries === 0;

  return (
    <Card className="card-elevated">
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
        <div>
          <CardTitle>Inquiries</CardTitle>
          <CardDescription>
            Submissions from approachable.dev contact, team training, and blog newsletter subscribe forms
          </CardDescription>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={downloadCsv} disabled={csvDisabled}>
            <Download className="mr-2 h-4 w-4" /> Download CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs
            value={activeTab}
            onValueChange={(value) => {
              setActiveTab(value as InquiryTab);
              setExpandedId(null);
            }}
          >
            <TabsList>
              <TabsTrigger value="contact">
                Contact Us
                <Badge variant="secondary" className="ml-2">
                  {contactInquiries.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="corporate">
                Team Training
                <Badge variant="secondary" className="ml-2">
                  {corporateInquiries.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="blog">
                Blog Subscribers
                <Badge variant="secondary" className="ml-2">
                  {blogSubscribers.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="contact" className="mt-4">
              <InquiryList emptyMessage="No contact form submissions yet. Submissions from the contact page will appear here.">
                {contactInquiries.map((inquiry, index) => (
                  <ContactInquiryCard
                    key={inquiry.id}
                    inquiry={inquiry}
                    index={index}
                    isExpanded={expandedId === inquiry.id}
                    deletingId={deletingId}
                    onToggle={() => setExpandedId(expandedId === inquiry.id ? null : inquiry.id)}
                    onDelete={handleDelete}
                  />
                ))}
              </InquiryList>
            </TabsContent>

            <TabsContent value="corporate" className="mt-4">
              <InquiryList emptyMessage="No team training inquiries yet. Submissions from the corporate training form will appear here.">
                {corporateInquiries.map((inquiry, index) => (
                  <CorporateInquiryCard
                    key={inquiry.id}
                    inquiry={inquiry}
                    index={index}
                    isExpanded={expandedId === inquiry.id}
                    deletingId={deletingId}
                    onToggle={() => setExpandedId(expandedId === inquiry.id ? null : inquiry.id)}
                    onDelete={handleDelete}
                  />
                ))}
              </InquiryList>
            </TabsContent>

            <TabsContent value="blog" className="mt-4">
              <InquiryList emptyMessage="No blog subscribers yet. Subscriptions from the blog/footer subscribe forms will appear here.">
                {blogSubscribers.map((subscriber, index) => (
                  <BlogSubscriberRow
                    key={subscriber.email}
                    subscriber={subscriber}
                    index={index}
                    deletingEmail={deletingEmail}
                    onDelete={handleDeleteSubscriber}
                  />
                ))}
              </InquiryList>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
