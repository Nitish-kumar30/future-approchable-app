import { useEffect, useState } from "react";
import { Building2, ChevronDown, ChevronUp, Download, Loader2, Mail, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  CorporateInquiry,
  fetchCorporateInquiries,
  formatInquiryDate,
  inquiriesToCsv,
} from "@/lib/corporate-inquiries";

function DetailField({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm">{value}</dd>
    </div>
  );
}

export default function CorporateInquiriesAdminTab() {
  const { toast } = useToast();
  const [inquiries, setInquiries] = useState<CorporateInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchCorporateInquiries();
      setInquiries(data);
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

  const downloadCsv = () => {
    const csv = inquiriesToCsv(inquiries);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "corporate-inquiries.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="card-elevated">
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
        <div>
          <CardTitle>Corporate Training Inquiries</CardTitle>
          <CardDescription>
            Submissions from the team inquiry form on approachable.dev, newest first
          </CardDescription>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={downloadCsv} disabled={inquiries.length === 0}>
            <Download className="mr-2 h-4 w-4" /> Download CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : inquiries.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">
            No inquiries yet. Submissions from the corporate training form will appear here.
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              {inquiries.length} inquiry{inquiries.length !== 1 ? "ies" : ""}
            </p>
            <div className="space-y-3">
              {inquiries.map((inquiry, index) => {
                const isExpanded = expandedId === inquiry.id;
                return (
                  <Card key={inquiry.id} className="border">
                    <div
                      className="flex items-center justify-between gap-4 p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setExpandedId(isExpanded ? null : inquiry.id)}
                    >
                      <div className="flex items-start gap-4 min-w-0 flex-1 flex-wrap">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="font-medium">{inquiry.company || "Unknown company"}</span>
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
                      <div className="flex items-center gap-3 shrink-0">
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

                        {inquiry.tiers.length > 0 && (
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                              Tiers to include
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {inquiry.tiers.map((tier) => (
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
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
