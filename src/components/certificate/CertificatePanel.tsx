import { useEffect, useState } from "react";
import { Award, Download, Loader2, RefreshCw, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  CertificateEligibility,
  CertificateTier,
  downloadCertificate,
  fetchCertificateEligibility,
  regenerateCertificate,
  requestCertificate,
  tierLabel,
} from "@/lib/certificates";

type Props = {
  cohortId?: string;
  courseId?: string;
  programName?: string;
  variant?: "panel" | "header" | "course";
};

const TIERS: CertificateTier[] = ["foundation", "practitioner", "expert"];

export default function CertificatePanel({
  cohortId,
  courseId,
  programName,
  variant = "panel",
}: Props) {
  const isCourseMode = variant === "course" || (!!courseId && !cohortId);
  const isHeaderMode = variant === "header";
  const { toast } = useToast();
  const [eligibility, setEligibility] = useState<CertificateEligibility | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tier, setTier] = useState<CertificateTier>("foundation");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [note, setNote] = useState("");
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchCertificateEligibility({ cohortId, courseId });
      setEligibility(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [cohortId, courseId]);

  const handleRequest = async (requestTier?: CertificateTier) => {
    const selectedTier = requestTier ?? tier;
    setSubmitting(true);
    try {
      const result = await requestCertificate({
        cohortId,
        courseId,
        tier: selectedTier,
        linkedinPostUrl: !isCourseMode ? linkedinUrl : undefined,
        learnerNote: note || undefined,
      });

      if (result.certificate) {
        toast({ title: "Certificate issued!", description: "Your certificate is ready — downloading now." });
        await downloadCertificate(result.certificate.certificate_id).catch(() => {
          // Download can be retried from the certificate list below; issuance already succeeded.
        });
      } else {
        toast({ title: "Certificate requested", description: "An admin will review your request." });
      }

      setModalOpen(false);
      setLinkedinUrl("");
      setNote("");
      await load();
    } catch (err) {
      toast({
        title: "Request failed",
        description: err instanceof Error ? err.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownload = async (certificateId: string) => {
    try {
      await downloadCertificate(certificateId);
    } catch (err) {
      toast({
        title: "Download failed",
        description: err instanceof Error ? err.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleRegenerate = async (certificateId: string) => {
    setRegeneratingId(certificateId);
    try {
      await regenerateCertificate(certificateId);
      toast({
        title: "Certificate updated",
        description: "Your certificate has been refreshed — downloading now.",
      });
      await downloadCertificate(certificateId).catch(() => {});
      await load();
    } catch (err) {
      toast({
        title: "Regenerate failed",
        description: err instanceof Error ? err.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setRegeneratingId(null);
    }
  };

  const renderCertActions = (certificateId: string) => (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" onClick={() => handleDownload(certificateId)}>
        <Download className="h-4 w-4 mr-1" />
        PDF
      </Button>
      <Button
        size="icon"
        variant="outline"
        title="Regenerate certificate"
        onClick={() => handleRegenerate(certificateId)}
        disabled={regeneratingId === certificateId}
      >
        {regeneratingId === certificateId ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="h-4 w-4" />
        )}
      </Button>
    </div>
  );

  if (loading) {
    if (isHeaderMode) return null;
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!eligibility?.enrolled) return null;

  // ---- Course mode (panel only) ----
  if (isCourseMode) {
    const foundationCert = eligibility.existing_certificates.find((c) => c.tier === "foundation");
    const canDownload = eligibility.foundation_requestable && !foundationCert;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Award className="h-5 w-5" />
            Certificate
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {foundationCert && (
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <Badge>{tierLabel(foundationCert.tier)}</Badge>
                <span className="text-sm text-muted-foreground">{foundationCert.certificate_id}</span>
              </div>
              {renderCertActions(foundationCert.certificate_id)}
            </div>
          )}

          {canDownload && (
            <Button onClick={() => handleRequest("foundation")} disabled={submitting}>
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download Certificate
                </>
              )}
            </Button>
          )}

          {!foundationCert && !canDownload && (
            <p className="text-sm text-muted-foreground">
              Complete 100% of lessons and quizzes to unlock your certificate.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  const issuedTiers = new Set(eligibility.existing_certificates.map((c) => c.tier));
  const pendingTiers = new Set(eligibility.pending_requests.map((r) => r.tier));
  const availableTiers = TIERS.filter((t) => !issuedTiers.has(t) && !pendingTiers.has(t));
  const isTierDisabled = (t: CertificateTier) =>
    t === "foundation" && !eligibility.foundation_requestable;
  const canRequestAny = availableTiers.length > 0;

  // ---- Header mode: compact trigger button + management dialog ----
  if (isHeaderMode) {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => setModalOpen(true)}
          title="Manage certificates"
        >
          <Trophy className="h-4 w-4" />
          Certificate
        </Button>

        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Certificates</DialogTitle>
              <DialogDescription>
                Manage your certificates for {programName || "this cohort"}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {eligibility.existing_certificates.length > 0 && (
                <div className="space-y-2">
                  <Label>Issued</Label>
                  {eligibility.existing_certificates.map((cert) => (
                    <div
                      key={cert.certificate_id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-2">
                        <Badge>{tierLabel(cert.tier)}</Badge>
                        <span className="text-sm text-muted-foreground">{cert.certificate_id}</span>
                      </div>
                      {renderCertActions(cert.certificate_id)}
                    </div>
                  ))}
                </div>
              )}

              {eligibility.pending_requests.length > 0 && (
                <div className="space-y-2">
                  <Label>Pending</Label>
                  {eligibility.pending_requests.map((req) => (
                    <div key={req.id} className="rounded-lg border border-dashed p-3 text-sm">
                      <Badge variant="secondary">{tierLabel(req.tier)}</Badge>
                      <span className="ml-2 text-muted-foreground">Request {req.status}</span>
                    </div>
                  ))}
                </div>
              )}

              {canRequestAny && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <Label>Tier</Label>
                    <Select value={tier} onValueChange={(v) => setTier(v as CertificateTier)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTiers.map((t) => (
                          <SelectItem key={t} value={t} disabled={isTierDisabled(t)}>
                            {tierLabel(t)}
                            {isTierDisabled(t) ? " (requires 100% progress)" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="space-y-2">
                      <Label htmlFor="linkedin-header">
                        LinkedIn post URL <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="linkedin-header"
                        placeholder="https://linkedin.com/posts/..."
                        value={linkedinUrl}
                        onChange={(e) => setLinkedinUrl(e.target.value)}
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Share a LinkedIn post about your learning to submit your request.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="note-header">Note (optional)</Label>
                      <Textarea
                        id="note-header"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={2}
                      />
                    </div>

                    {!eligibility.foundation_requestable &&
                      !issuedTiers.has("foundation") &&
                      !pendingTiers.has("foundation") && (
                        <p className="text-xs text-muted-foreground">
                          Foundation certificate requires 100% progress (all videos and quizzes).
                        </p>
                      )}
                  </div>
                </>
              )}

              {!canRequestAny && eligibility.existing_certificates.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No certificates available for this cohort yet.
                </p>
              )}
            </div>
            {canRequestAny && (
              <DialogFooter>
                <Button
                  onClick={() => handleRequest()}
                  disabled={submitting || isTierDisabled(tier) || !linkedinUrl.trim()}
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : tier === "foundation" ? (
                    "Get Certificate"
                  ) : (
                    "Submit Request"
                  )}
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // ---- Panel mode (cohort) ----
  const openRequestModal = () => {
    setTier(availableTiers[0] ?? "foundation");
    setModalOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Award className="h-5 w-5" />
            Certificates
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {eligibility.existing_certificates.length > 0 && (
            <div className="space-y-2">
              {eligibility.existing_certificates.map((cert) => (
                <div key={cert.certificate_id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <Badge>{tierLabel(cert.tier)}</Badge>
                    <span className="text-sm text-muted-foreground">{cert.certificate_id}</span>
                  </div>
                  {renderCertActions(cert.certificate_id)}
                </div>
              ))}
            </div>
          )}

          {eligibility.pending_requests.length > 0 && (
            <div className="space-y-2">
              {eligibility.pending_requests.map((req) => (
                <div key={req.id} className="rounded-lg border border-dashed p-3 text-sm">
                  <Badge variant="secondary">{tierLabel(req.tier)}</Badge>
                  <span className="ml-2 text-muted-foreground">Request {req.status}</span>
                </div>
              ))}
            </div>
          )}

          {canRequestAny && (
            <Button onClick={openRequestModal}>Request Certificate</Button>
          )}

          {canRequestAny && !eligibility.foundation_requestable && !issuedTiers.has("foundation") && !pendingTiers.has("foundation") && (
            <p className="text-xs text-muted-foreground">
              Foundation certificate requires 100% progress (all videos and quizzes).
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Certificate</DialogTitle>
            <DialogDescription>
              {tier === "foundation"
                ? "At 100% progress your Foundation certificate is issued instantly — no admin review needed."
                : "Choose the certificate tier you are applying for. An admin will verify and issue your certificate."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tier</Label>
              <Select value={tier} onValueChange={(v) => setTier(v as CertificateTier)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableTiers.map((t) => (
                    <SelectItem key={t} value={t} disabled={isTierDisabled(t)}>
                      {tierLabel(t)}{isTierDisabled(t) ? " (requires 100% progress)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!isCourseMode && (
              <div className="space-y-2">
                <Label htmlFor="linkedin">
                  LinkedIn post URL <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="linkedin"
                  placeholder="https://linkedin.com/posts/..."
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Share a LinkedIn post about your learning to submit your request.
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="note">Note (optional)</Label>
              <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setModalOpen(false);
                setLinkedinUrl("");
                setNote("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleRequest()}
              disabled={submitting || isTierDisabled(tier) || (!isCourseMode && !linkedinUrl.trim())}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : tier === "foundation" ? (
                "Get Certificate"
              ) : (
                "Submit Request"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}