import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import HlsPlayer from '@/components/video/HlsPlayer';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  hlsUrl: string | null;
}

export default function ChapterPreviewDialog({ open, onOpenChange, title, hlsUrl }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {hlsUrl ? (
          <div className="aspect-video w-full overflow-hidden rounded-md bg-black">
            <HlsPlayer src={hlsUrl} autoPlay className="h-full w-full" />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Preview is not available yet.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
