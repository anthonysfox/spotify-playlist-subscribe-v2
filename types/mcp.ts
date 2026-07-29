import { SubscriptionFrequency, SyncMode } from "@/generated/prisma/enums";
import { MusicProvider } from "@/lib/music";

export interface SubscribeParams {
  userId: string;
  sourcePlaylistId: string;
  mangedPlaylistId?: string;
  newPlaylistName?: string;
  provider: MusicProvider;
  frequency: SubscriptionFrequency;
  syncMode: SyncMode;
  quantityPerSource: number;
  vibePrompt?: string;
}
