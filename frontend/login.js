const ring = document.getElementById("loginRing");
const form = document.getElementById("loginForm");
const errorEl = document.getElementById("loginError");

const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";").shift();
  return "";
};

const setRingState = (state) => {
  ring.classList.remove("is-success", "is-error");
  if (state === "success") ring.classList.add("is-success");
  if (state === "error") ring.classList.add("is-error");
};

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  errorEl.textContent = "";
  setRingState("idle");

  const formData = new FormData(form);
  try {
    const response = await fetch(window.location.pathname, {
      method: "POST",
      headers: {
        "X-Requested-With": "XMLHttpRequest",
        "X-CSRFToken": getCookie("csrftoken"),
      },
      credentials: "same-origin",
      body: formData,
    });

    if (response.ok) {
      setRingState("success");
      document.body.classList.add("login-transition");
      setTimeout(() => {
        window.location.href = "/";
      }, 700);
      return;
    }

    const payload = await response.json().catch(() => ({}));
    setRingState("error");
    errorEl.textContent = payload.error || "Login failed. Please try again.";
  } catch (err) {
    setRingState("error");
    errorEl.textContent = "Login failed. Please try again.";
  }
});
