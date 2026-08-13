import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Award, CheckCircle2, Loader2, XCircle } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { verifyCertificatePublic, tierLabel } from "@/lib/certificates";

type VerifyResult = {
  valid: boolean;
  message?: string;
  certificate?: {
    certificate_id: string;
    recipient_name: string;
    tier: string;
    program_name: string;
    completion_date: string;
    issued_at: string;
  };
};

export default function VerifyCertificate() {
  const { certificateId } = useParams<{ certificateId: string }>();
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!certificateId) return;
    (async () => {
      try {
        const data = await verifyCertificatePublic(certificateId);
        setResult(data);
      } catch {
        setResult({ valid: false, message: "Verification failed" });
      } finally {
        setLoading(false);
      }
    })();
  }, [certificateId]);

  return (
    <AppShell>
      <div className="container max-w-lg py-16">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Award className="h-6 w-6" />
              Certificate Verification
            </CardTitle>
            <CardDescription>approachable.dev</CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            {loading ? (
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            ) : result?.valid && result.certificate ? (
              <>
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
                <p className="font-semibold text-lg">Valid Certificate</p>
                <div className="text-left space-y-2 rounded-lg border p-4">
                  <p><span className="text-muted-foreground">Recipient:</span> {result.certificate.recipient_name}</p>
                  <p><span className="text-muted-foreground">Tier:</span> <Badge>{tierLabel(result.certificate.tier as "foundation")}</Badge></p>
                  <p><span className="text-muted-foreground">Program:</span> {result.certificate.program_name}</p>
                  <p><span className="text-muted-foreground">Completed:</span> {result.certificate.completion_date}</p>
                  <p><span className="text-muted-foreground">Certificate ID:</span> {result.certificate.certificate_id}</p>
                </div>
              </>
            ) : (
              <>
                <XCircle className="h-12 w-12 text-destructive mx-auto" />
                <p className="font-semibold">Certificate Not Found</p>
                <p className="text-sm text-muted-foreground">{result?.message ?? "This certificate could not be verified."}</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
