import { useEffect, useState } from "react";
import { Award, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  downloadCertificate,
  fetchMyCertificates,
  IssuedCertificate,
  tierLabel,
} from "@/lib/certificates";

export default function MyCertificatesSection() {
  const { toast } = useToast();
  const [certificates, setCertificates] = useState<IssuedCertificate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchMyCertificates();
        setCertificates(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5" />
          My Certificates
        </CardTitle>
        <CardDescription>Download your issued certificates</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : certificates.length === 0 ? (
          <p className="text-sm text-muted-foreground">No certificates issued yet.</p>
        ) : (
          <div className="space-y-3">
            {certificates.map((cert) => (
              <div key={cert.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border p-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge>{tierLabel(cert.tier)}</Badge>
                    <span className="font-medium">{cert.program_name}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {cert.certificate_id} · Issued {new Date(cert.issued_at).toLocaleDateString()}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => handleDownload(cert.certificate_id)}>
                  <Download className="h-4 w-4 mr-1" />
                  Download PDF
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
