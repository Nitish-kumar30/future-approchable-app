import { useEffect, useState } from "react";
import { Award, Check, ExternalLink, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  CertificateRequestRow,
  fetchCertificateRequests,
  issueCertificate,
  reviewCertificateRequest,
  tierLabel,
} from "@/lib/certificates";

export default function CertificatesAdminTab() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<CertificateRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [actingId, setActingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchCertificateRequests({ status: statusFilter || undefined });
      setRequests(data.requests);
    } catch (err) {
      toast({
        title: "Failed to load requests",
        description: err instanceof Error ? err.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [statusFilter]);

  const handleReview = async (id: string, action: "approve" | "reject") => {
    setActingId(id);
    try {
      await reviewCertificateRequest(id, action);
      toast({ title: action === "approve" ? "Request approved" : "Request rejected" });
      await load();
    } catch (err) {
      toast({
        title: "Action failed",
        description: err instanceof Error ? err.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setActingId(null);
    }
  };

  const handleIssue = async (id: string) => {
    setActingId(id);
    try {
      await issueCertificate({ requestId: id });
      toast({ title: "Certificate issued", description: "PDF generated and saved." });
      await load();
    } catch (err) {
      toast({
        title: "Issue failed",
        description: err instanceof Error ? err.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setActingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5" />
          Certificate Requests
        </CardTitle>
        <CardDescription>Review learner requests and issue certificates</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="issued">Issued</SelectItem>
          </SelectContent>
        </Select>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : requests.length === 0 ? (
          <p className="text-sm text-muted-foreground">No certificate requests found.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Learner</TableHead>
                  <TableHead>Program</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>LinkedIn</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell>
                      <div className="font-medium">{req.learner_name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{req.learner_email}</div>
                    </TableCell>
                    <TableCell>{req.program_name}</TableCell>
                    <TableCell><Badge variant="outline">{tierLabel(req.tier)}</Badge></TableCell>
                    <TableCell>{req.progress_percent}%</TableCell>
                    <TableCell>
                      {req.linkedin_post_url ? (
                        <a href={req.linkedin_post_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary text-sm">
                          View <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : "—"}
                    </TableCell>
                    <TableCell><Badge>{req.status}</Badge></TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {req.status === "pending" && (
                          <>
                            <Button size="sm" variant="outline" disabled={actingId === req.id} onClick={() => handleReview(req.id, "approve")}>
                              <Check className="h-3 w-3 mr-1" /> Approve
                            </Button>
                            <Button size="sm" variant="outline" disabled={actingId === req.id} onClick={() => handleReview(req.id, "reject")}>
                              <X className="h-3 w-3 mr-1" /> Reject
                            </Button>
                          </>
                        )}
                        {req.status === "approved" && (
                          <Button size="sm" disabled={actingId === req.id} onClick={() => handleIssue(req.id)}>
                            {actingId === req.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Issue"}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
