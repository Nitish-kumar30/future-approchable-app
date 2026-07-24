import { useEffect, useState } from "react";
import { Award, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  requestCertificate,
  tierLabel,
} from "@/lib/certificates";

type Props = {
  cohortId?: string;
  courseId?: string;
  programName?: string;
};

const TIERS: CertificateTier[] = ["foundation", "practitioner", "expert"];

export default function CertificatePanel({ cohortId, courseId, programName }: Props) {
  const { toast } = useToast();
  const [eligibility, setEligibility] = useState<CertificateEligibility | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tier, setTier] = useState<CertificateTier>("foundation");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [note, setNote] = useState("");

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

  const handleRequest = async () => {
    setSubmitting(true);
    try {
      await requestCertificate({
        cohortId,
        courseId,
        tier,
        linkedinPostUrl: tier === "foundation" ? linkedinUrl : undefined,
        learnerNote: note || undefined,
      });
      toast({ title: "Certificate requested", description: "An admin will review your request." });
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

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!eligibility?.enrolled) return null;

  const issuedTiers = new Set(eligibility.existing_certificates.map((c) => c.tier));
  const pendingTiers = new Set(eligibility.pending_requests.map((r) => r.tier));
  const availableTiers = TIERS.filter((t) => !issuedTiers.has(t) && !pendingTiers.has(t));
  const canRequestAny = availableTiers.length > 0;

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
          <CardDescription>
            {programName ? `${programName} — ` : ""}
            {eligibility.progress_percent}% complete
          </CardDescription>
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
                  <Button size="sm" variant="outline" onClick={() => handleDownload(cert.certificate_id)}>
                    <Download className="h-4 w-4 mr-1" />
                    PDF
                  </Button>
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
              Choose the certificate tier you are applying for. An admin will verify and issue your certificate.
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
                    <SelectItem key={t} value={t}>
                      {tierLabel(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {tier === "foundation" && (
              <div className="space-y-2">
                <Label htmlFor="linkedin">LinkedIn post URL</Label>
                <Input
                  id="linkedin"
                  placeholder="https://linkedin.com/posts/..."
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                />
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
              onClick={handleRequest}
              disabled={submitting || (tier === "foundation" && !linkedinUrl.trim())}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
