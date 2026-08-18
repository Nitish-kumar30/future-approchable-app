import type { NextSessionInfo } from './NextSessionOverlay';

export interface OnDemandPlayerProps {
  videoUrl: string;
  title: string;
  nextSession: NextSessionInfo | null;
  onCompleted: () => void;
  onNextSession: () => void;
  autoPlay?: boolean;
  onAutoPlayConsumed?: () => void;
  onPlay?: () => void;
  showUpsellOverlay?: boolean;
}
