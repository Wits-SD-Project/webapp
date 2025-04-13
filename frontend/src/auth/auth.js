export const signUpUser = async ({ name, email, password, role }) => {
  const res = await fetch("http://localhost:5000/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password, role }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Signup failed");
  }

  return await res.json();
};


export const signInUser = async ({ email, password }) => {
  const res = await fetch("http://localhost:5000/api/auth/signin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const err = await res.json();
    console.log(err)
    throw new Error(err.message || "Signin failed");
  }

  return await res.json();
};

