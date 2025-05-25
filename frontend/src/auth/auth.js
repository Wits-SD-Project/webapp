import { getAuth } from "firebase/auth";

export const getAuthToken = async () => {
  const user = getAuth().currentUser;
  if (!user) throw new Error("User not authenticated");
  return user.getIdToken();
};

export const signUpWithThirdParty = async ({ idToken, provider, role }) => {
  const res = await fetch(
    // "https://ssbackend-aka9gddqdxesexh5.canadacentral-01.azurewebsites.net/api/auth/signup/thirdparty",
    `${process.env.REACT_APP_API_BASE_URL}/api/auth/signup/thirdparty`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken, provider, role }),
    }
  );

  const data = await res.json();

  if (!res.ok) {
    const error = new Error(data.message || "Third-party signup failed");
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data;
};

export const signInWithThirdParty = async ({ idToken }) => {
  const res = await fetch(
    `${process.env.REACT_APP_API_BASE_URL}/api/auth/signin/thirdparty`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    }
  );

  const data = await res.json();

  if (!res.ok) {
    const error = new Error(data.message || "Third-party signin failed");
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data;
};
export const uploadFacility = async ({
  name,
  type,
  isOutdoors,
  availability,
}) => {
  const res = await fetch(
    `${process.env.REACT_APP_API_BASE_URL}/api/facilities/upload`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, type, isOutdoors, availability }),
      credentials: "include",
    }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Facility Upload Failed");
  }

  return await res.json();
};
