import { getAuth } from "firebase/auth";

export const getAuthToken = async () => {
  const user = getAuth().currentUser;
  if (!user) throw new Error("User not authenticated");
  return user.getIdToken();
};

export const signUpUser = async ({ name, email, password, role }) => {
  const res = await fetch(
    // "https://ssbackend-aka9gddqdxesexh5.canadacentral-01.azurewebsites.net/api/auth/signup",
    "http://localhost:8080/api/auth/signup",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role }),
    }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Signup failed");
  }

  return await res.json();
};

export const signUpWithThirdParty = async ({ idToken, provider, role }) => {
  const res = await fetch(
    // "https://ssbackend-aka9gddqdxesexh5.canadacentral-01.azurewebsites.net/api/auth/signup/thirdparty",
    "http://localhost:8080/api/auth/signup/thirdparty",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken, provider, role }),
    }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Third-party signup failed");
  }

  return await res.json();
};

export const signInUser = async ({ email, password }) => {
  const res = await fetch(
    // "https://ssbackend-aka9gddqdxesexh5.canadacentral-01.azurewebsites.net/api/auth/signin",
    "http://localhost:8080/api/auth/signin",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    }
  );

  if (!res.ok) {
    const err = await res.json();
    console.log(err);
    throw new Error(err.message || "Signin failed");
  }

  return await res.json();
};

export const signInWithThirdParty = async ({ idToken }) => {
  const res = await fetch(
    // "https://ssbackend-aka9gddqdxesexh5.canadacentral-01.azurewebsites.net/api/auth/signin/thirdparty",
    "http://localhost:8080/api/auth/signin/thirdparty",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Third-party signin failed");
  }

  return await res.json();
};

export const uploadFacility = async ({
  name,
  type,
  isOutdoors,
  availability,
}) => {
  const res = await fetch("http://localhost:8080/api/facilities/upload:", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, type, isOutdoors, availability }),
    credentials: "include",
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Facility Upload Failed");
  }

  return await res.json();
};
