export interface CurrentUser {
  id: string;
  name: string;
  email: string;
}

const MOCK_USER: CurrentUser = {
  id: "user:demo",
  name: "Demo User",
  email: "demo@example.com",
};

/** Single seam for "who is signed in" — swap the body for a real session lookup later. */
export async function getCurrentUser(): Promise<CurrentUser> {
  return MOCK_USER;
}
