export function getProfilePhotoKey(loginId: string) {
  return `sinyalkita_profile_photo_${loginId}`;
}

export function getProfileInitials(name: string) {
  return (name || "SK")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function getStoredProfilePhoto(loginId?: string | null) {
  if (!loginId || typeof window === "undefined") return null;
  return localStorage.getItem(getProfilePhotoKey(loginId));
}
