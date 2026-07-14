import { Metadata } from "next";
import { AppleMusicConnect } from "../components/AppleMusicConnect";

export const metadata: Metadata = {
  title: "PlaylistFox - Profile",
};

export default async function Profile() {
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">Profile</h1>
        <p className="text-gray-600 mb-8">
          Connect the music services PlaylistFox can sync with.
        </p>

        <div className="space-y-3">
          <AppleMusicConnect />
        </div>
      </div>
    </div>
  );
}
