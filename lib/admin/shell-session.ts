export type AdminShellSession = {
  role: "owner" | "designer";
  artistId: string | null;
  artistName: string | null;
  profileName: string;
};
