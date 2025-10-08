// ---------- Utility ----------
function safeGet(id) {
  return document.getElementById(id);
}

function getCurrentUser() {
  const raw = localStorage.getItem("currentUser");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed.id ? parsed : null;
  } catch {
    return null;
  }
}

function currentUserName() {
  const user = getCurrentUser();
  return user?.name || user?.email || "Anonymous";
}

function isLoggedIn() {
  return !!localStorage.getItem("token");
}

// Use a single base so we don't mix localhost/127.0.0.1 and create one place to change host/port
const API_BASE = "https://klqueries-backend-production.up.railway.app";


// ---------- Signup ----------
async function handleSignup() {
  const name = safeGet("signupName")?.value?.trim();
  const email = safeGet("signupEmail")?.value?.trim();
  const mobile = safeGet("signupMobile")?.value?.trim();
  const pass = safeGet("signupPass")?.value;
  const passC = safeGet("signupPassConfirm")?.value;
  const about = safeGet("signupAbout")?.value?.trim();

  if (!name || !email || !mobile || !pass || !passC) {
    return alert("Fill all fields!");
  }

  if (pass !== passC) {
    return alert("Passwords do not match!");
  }

  const payload = { name, email, mobile, password: pass, about };

  try {
    const res = await fetch(`${API_BASE}/api/users/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      let message = "Email or Mobile already registered..Try logging in...";
      try {
        const errData = await res.clone().json();
        const raw = errData.error || errData.message || "";
        if (raw.includes("Email already registered")) {
          message = "This email is already registered. Try logging in.";
        } else if (raw.includes("Mobile already registered")) {
          message = "This mobile number is already registered.";
        } else {
          message = raw || message;
        }
      } catch {
        const text = await res.text();
        if (text.includes("Email already registered")) {
          message = "This email is already registered. Try logging in.";
        } else if (text.includes("Mobile already registered")) {
          message = "This mobile number is already registered.";
        } else {
          message = text || message;
        }
      }

      throw new Error(message);
    }

    alert("Signup successful! Please log in to continue.");
    window.location.href = "login.html";
  } catch (err) {
    alert("Error: " + err.message);
  }
}

// ---------- Login ----------
async function handleLogin() {
  const input = safeGet("loginInput")?.value?.trim();
  const pass = safeGet("loginPass")?.value;

  if (!input || !pass) {
    alert("Enter credentials!");
    return;
  }

  const payload = { emailOrMobile: input, password: pass };
  console.log("Login payload:", payload);

  try {
    const res = await fetch(`${API_BASE}/api/users/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const text = await res.text();
    let data = {};

    try {
      data = JSON.parse(text);
    } catch {
      throw new Error("Invalid response from server");
    }

    if (!res.ok || !data.token) {
      throw new Error(data.error || "Login failed");
    }

    localStorage.setItem("token", data.token);
    localStorage.setItem("currentUser", JSON.stringify(data.user));
    alert("Login successful! Redirecting to queries...");
    window.location.href = "queries.html";
  } catch (err) {
    alert("Error: " + err.message);
  }
}

// ---------- Forgot Password ----------
async function sendOTP() {
  const val = safeGet("fpInput")?.value?.trim();
  if (!val || !val.includes("@")) {
    alert("Only Gmail-based reset is supported for now.");
    return;
  }
   alert("Please wait... sending OTP to your inbox.");

  try {
    const res = await fetch(`${API_BASE}/api/users/send-otp?emailOrMobile=${encodeURIComponent(val)}`, {
      method: "POST"
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Failed to send OTP");
    }

    localStorage.setItem("resetEmail", val);
    alert("OTP sent to your inbox. Please check Gmail.");
    window.location.href = "otp-verify.html";
  } catch (err) {
    alert("Error: " + err.message);
  }
}

async function verifyOTPPage() {
  const entered = safeGet("otpInput")?.value?.trim();
  const email = localStorage.getItem("resetEmail");

  if (!entered || !email) {
    alert("Missing OTP or email.");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/users/verify-otp?emailOrMobile=${encodeURIComponent(email)}&otp=${encodeURIComponent(entered)}`, {
      method: "POST"
    });

    const text = await res.text();
    if (!res.ok || text !== "true") {
      throw new Error("Invalid OTP");
    }

    alert("OTP verified. Redirecting to reset password page...");
    window.location.href = "reset-password.html";
  } catch (err) {
    alert("Error: " + err.message);
  }
}
async function resendOTP() {
  const email = localStorage.getItem("resetEmail");
  if (!email) return alert("Missing email. Please restart reset flow.");

  const btn = safeGet("resendBtn");
  const timer = safeGet("resendTimer");

  btn.disabled = true;
  let seconds = 30;
  timer.textContent = `Resend in ${seconds}s`;

  const countdown = setInterval(() => {
    seconds--;
    timer.textContent = `Resend in ${seconds}s`;
    if (seconds <= 0) {
      clearInterval(countdown);
      btn.disabled = false;
      timer.textContent = "";
    }
  }, 1000);

  alert("Please wait... sending new OTP to your inbox.");

  try {
    const res = await fetch(`${API_BASE}/api/users/send-otp?emailOrMobile=${encodeURIComponent(email)}`, {
      method: "POST"
    });

    if (!res.ok) throw new Error("Failed to resend OTP");

    alert("New OTP sent! Check your Gmail.");
  } catch (err) {
    alert("Error: " + err.message);
  }
}



async function handleResetPassword() {
  const newP = safeGet("newPass")?.value;
  const conf = safeGet("confirmPass")?.value;
  const emailOrMobile = localStorage.getItem("resetEmail");

  if (!newP || !conf) {
    alert("Fill both fields!");
    return;
  }
  if (newP !== conf) {
    alert("Passwords do not match!");
    return;
  }
  if (!emailOrMobile) {
    alert("Missing email or mobile. Please restart reset flow.");
    return;
  }

  const payload = {
    emailOrMobile,
    newPassword: newP
  };

  try {
    const res = await fetch(`${API_BASE}/api/users/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const text = await res.text();
    if (!res.ok) throw new Error(text || "Reset failed");

    localStorage.removeItem("resetEmail");
    alert("Password reset successful. Redirecting to login...");
    window.location.href = "login.html";
  } catch (err) {
    alert("Error: " + err.message);
  }
}

// ---------- Attendance Calculation ----------
(function attendanceSetup() {
  document.addEventListener("DOMContentLoaded", () => {
    const calcBtn = safeGet("calculateAttendanceBtn");
    if (!calcBtn) return;

    calcBtn.addEventListener("click", () => {
      const lec = parseFloat(safeGet("lecture")?.value) || 0;
      const prac = parseFloat(safeGet("practical")?.value) || 0;
      const tut = parseFloat(safeGet("tutorial")?.value) || 0;
      const skill = parseFloat(safeGet("skilling")?.value) || 0;

      const lecConducted = safeGet("lectureConducted")?.checked ? 1 : 0;
      const pracConducted = safeGet("practicalConducted")?.checked ? 1 : 0;
      const tutConducted = safeGet("tutorialConducted")?.checked ? 1 : 0;
      const skillConducted = safeGet("skillingConducted")?.checked ? 1 : 0;

      const lectureWeight = parseFloat(safeGet("lectureWeight")?.value) || 0;
      const practicalWeight = parseFloat(safeGet("practicalWeight")?.value) || 0;
      const tutorialWeight = parseFloat(safeGet("tutorialWeight")?.value) || 0;
      const skillingWeight = parseFloat(safeGet("skillingWeight")?.value) || 0;

      const totalWeight = (lectureWeight * lecConducted) +
                          (practicalWeight * pracConducted) +
                          (tutorialWeight * tutConducted) +
                          (skillingWeight * skillConducted);

      const rb = safeGet("resultBox");
      const qb = safeGet("quoteBox");

      if (totalWeight === 0) {
        if (rb) {
          rb.style.display = "block";
          rb.style.background = "gray";
          rb.innerHTML = "No classes conducted!";
        }
        if (qb) qb.innerHTML = "";
        return;
      }

      const weightedAttendance = (
        (lec * lecConducted * lectureWeight) +
        (prac * pracConducted * practicalWeight) +
        (tut * tutConducted * tutorialWeight) +
        (skill * skillConducted * skillingWeight)
      ) / totalWeight;

      if (rb) {
        rb.style.display = "block";
        if (weightedAttendance >= 85) {
          rb.style.background = "#34D399";
          rb.innerHTML = `${weightedAttendance.toFixed(2)}% - Nicee keep going 😎`;
          if (qb) qb.innerHTML = "Excellent! Keep up the great work!";
        } else if (weightedAttendance >= 75) {
          rb.style.background = "#FACC15";
          rb.innerHTML = `${weightedAttendance.toFixed(2)}% - Attention needed ⚠️`;
          if (qb) qb.innerHTML = "Almost there! A little more effort to reach excellence.";
        } else {
          rb.style.background = "#F87171";
          rb.innerHTML = `${weightedAttendance.toFixed(2)}% - Risky bro, attend all classes 🚨`;
          if (qb) qb.innerHTML = "Critical! Attend all classes without bunking.";
        }
      }
    });
  });
})();

// ---------- Bunk Prediction ----------
(function bunkSetup() {
  document.addEventListener("DOMContentLoaded", () => {
    const bunkToggle = safeGet("bunkBtn");
    const bunkSection = safeGet("bunkSection");
    const calcBunk = safeGet("calculateBunkBtn");

    if (bunkToggle && bunkSection) {
      bunkToggle.addEventListener("click", () => {
        bunkSection.style.display = bunkSection.style.display === "block" ? "none" : "block";
      });
    }

    if (calcBunk) {
      calcBunk.addEventListener("click", () => {
        const total = parseFloat(safeGet("totalClasses")?.value) || 0;
        const attend = parseFloat(safeGet("classesToAttend")?.value) || 0;
        const rb = safeGet("bunkResultBox");
        const qb = safeGet("bunkQuoteBox");

        if (!rb || !qb) return;

        if (total <= 0) {
          rb.style.display = "block";
          rb.style.background = "gray";
          rb.innerHTML = "Enter total classes!";
          qb.innerHTML = "";
          return;
        }

        if (attend < 0 || attend > total) {
          rb.style.display = "block";
          rb.style.background = "#F87171";
          rb.innerHTML = "Enter a valid number of classes to attend!";
          qb.innerHTML = "";
          return;
        }

        const newAttendance = (attend / total) * 100;
        rb.style.display = "block";

        if (newAttendance > 85) {
          rb.style.background = "#34D399";
          rb.innerHTML = `New Attendance: ${newAttendance.toFixed(2)}%`;
          qb.innerHTML = "Bunk happily brooo 🎉";
        } else if (newAttendance >= 75) {
          rb.style.background = "#383426ff";
          rb.innerHTML = `New Attendance: ${newAttendance.toFixed(2)}%`;
          qb.innerHTML = "Safe but you may be condonated 😅";
        } else {
          rb.style.background = "#F87171";
          rb.innerHTML = `New Attendance: ${newAttendance.toFixed(2)}%`;
          qb.innerHTML = "Risky to bunk bro 😰";
        }
      });
    }
  });
})();
// ---------- Queries Section ----------
// ---------- Queries Section ----------
(function queriesSetup() {
  document.addEventListener("DOMContentLoaded", () => {
    const queryListContainer = safeGet("queryListContainer");
    const submitBtn = safeGet("submitQueryBtn");
    const toggleFormBtn = safeGet("toggleQueryFormBtn");
    const queryFormContainer = safeGet("queryFormContainer");
    const queryTextInput = safeGet("queryText");
    const searchInput = safeGet("searchQueryInput");
    const sortSelect = safeGet("sortQuerySelect");

    if (!queryListContainer || !submitBtn || !toggleFormBtn) return;

    toggleFormBtn.addEventListener("click", () => {
      if (!isLoggedIn()) {
        localStorage.setItem("redirectAfterLogin", "queries");
        window.location.href = "login.html";
        return;
      }
      queryFormContainer.style.display =
        queryFormContainer.style.display === "block" ? "none" : "block";
    });

    submitBtn.addEventListener("click", async () => {
      if (!isLoggedIn()) {
        localStorage.setItem("redirectAfterLogin", "queries");
        window.location.href = "login.html";
        return;
      }

      const text = queryTextInput.value.trim();
      if (!text) {
        alert("Enter a query!");
        return;
      }

      const bannedWords = [
        "madda", "sulli", "lavada", "lanja", "sulliga", "gudha", "gudhamuyy", "maddaguduv",
        "fuck", "fuckoff", "fuckyou", "fuck off", "bastardd", "loveyou", "stupid",
        "killyou", "kill", "lanjodaka"
      ];
      const lowerText = text.toLowerCase();
      const containsAbuse = bannedWords.some(word => lowerText.includes(word));

      if (containsAbuse) {
        alert("❌ Sorry, we detected inappropriate words in your query. Please revise and try again.");
        return;
      }

      const user = getCurrentUser();
      const token = localStorage.getItem("token");

      try {
        const res = await fetch(`${API_BASE}/api/queries/post?userId=${user.id}&text=${encodeURIComponent(text)}`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });

        if (!res.ok) throw new Error("Failed to submit query");

        queryTextInput.value = "";
        alert("Query submitted successfully!");
        await loadQueries();
      } catch (err) {
        alert("Error: " + err.message);
      }
    });
 function showReportConfirmation(queryId, onConfirm) {
  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.background = "rgba(0,0,0,0.5)";
  overlay.style.display = "flex";
  overlay.style.justifyContent = "center";
  overlay.style.alignItems = "center";
  overlay.style.zIndex = "9999";

  const box = document.createElement("div");
  box.style.background = "#1e1e1e"; // ✅ dark background
  box.style.color = "#fff";         // ✅ white text
  box.style.padding = "20px";
  box.style.borderRadius = "8px";
  box.style.textAlign = "center";
  box.style.boxShadow = "0 0 10px rgba(0,0,0,0.3)";
  box.innerHTML = `<p style="margin-bottom: 16px;">Are you sure you want to report this query?</p>`;

  const yesBtn = document.createElement("button");
  yesBtn.textContent = "Yes";
  yesBtn.style.margin = "10px";
  yesBtn.style.padding = "6px 12px";
  yesBtn.style.background = "#ff4d4d";
  yesBtn.style.color = "#fff";
  yesBtn.style.border = "none";
  yesBtn.style.borderRadius = "4px";
  yesBtn.style.cursor = "pointer";

  const noBtn = document.createElement("button");
  noBtn.textContent = "No";
  noBtn.style.margin = "10px";
  noBtn.style.padding = "6px 12px";
  noBtn.style.background = "#ccc";
  noBtn.style.border = "none";
  noBtn.style.borderRadius = "4px";
  noBtn.style.cursor = "pointer";

  yesBtn.onclick = () => {
    overlay.remove();
    onConfirm();
  };

  noBtn.onclick = () => {
    overlay.remove();
  };

  box.appendChild(yesBtn);
  box.appendChild(noBtn);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
}



async function reportQuery(queryId) {
  if (!isLoggedIn()) return alert("Please log in to report.");

  const user = getCurrentUser();
  const token = localStorage.getItem("token");
  const reportKey = `reported_query_${queryId}`;
  const alreadyReported = localStorage.getItem(reportKey);

  if (alreadyReported === user.id.toString()) {
    alert("You've already reported this query.");
    return;
  }

  showReportConfirmation(queryId, async () => {
    try {
      const res = await fetch(`${API_BASE}/api/queries/${queryId}/report?userId=${user.id}`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (!res.ok) throw new Error("Failed to report");

      localStorage.setItem(reportKey, user.id.toString());
      alert("🚩 Query reported. Thanks for keeping KL clean!");
      await loadQueries();
    } catch (err) {
      alert("Error: " + err.message);
    }
  });
}



    async function loadQueries() {
  const token = localStorage.getItem("token");
  const searchText = searchInput?.value?.toLowerCase() || "";
  const sortOrder = sortSelect?.value || "newest";

  const headers = token ? { "Authorization": `Bearer ${token}` } : {};

  try {
    const res = await fetch(`${API_BASE}/api/queries?search=${encodeURIComponent(searchText)}&sort=${encodeURIComponent(sortOrder)}`, {
      headers
    });

    if (!res.ok) {
      console.error('Failed to load queries, status:', res.status);
      queryListContainer.innerHTML = "<p style='color:gray;padding:12px'>Could not load queries.</p>";
      return;
    }

    const queries = await res.json();
    try {
      renderQueriesFromBackend(Array.isArray(queries) ? queries : []);
    } catch (err) {
      console.error('Render error:', err);
      queryListContainer.innerHTML = "<p style='color:gray;padding:12px'>Error rendering queries.</p>";
    }
  } catch (err) {
    console.error("Failed to load queries:", err);
    queryListContainer.innerHTML = "<p style='color:gray;padding:12px'>Network error loading queries.</p>";
  }
}

    async function submitReplyBackend(queryId, replyText) {
      const user = getCurrentUser();
      const token = localStorage.getItem("token");

      const loadingPopup = document.createElement("div");
      loadingPopup.textContent = "Posting reply...";
      loadingPopup.style.position = "fixed";
      loadingPopup.style.top = "20px";
      loadingPopup.style.left = "50%";
      loadingPopup.style.transform = "translateX(-50%)";
      loadingPopup.style.background = "#0B0D1F";
      loadingPopup.style.color = "#fff";
      loadingPopup.style.padding = "10px 20px";
      loadingPopup.style.borderRadius = "8px";
      loadingPopup.style.zIndex = "9999";
      document.body.appendChild(loadingPopup);

      try {
        const res = await fetch(`${API_BASE}/api/queries/${queryId}/reply?userId=${user.id}&text=${encodeURIComponent(replyText)}`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}` }
        });

        if (!res.ok) throw new Error("Failed to post reply");

        loadingPopup.remove();
        await loadQueries();
      } catch (err) {
        loadingPopup.remove();
        alert("Error: " + err.message);
      }
    }

    async function deleteReplyBackend(replyId) {
      const user = getCurrentUser();
      const token = localStorage.getItem("token");

      try {
        const res = await fetch(`${API_BASE}/api/replies/${replyId}?userId=${user.id}`, {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${token}` }
        });

        if (!res.ok) throw new Error("Failed to delete reply");
        await loadQueries();
      } catch (err) {
        alert("Error: " + err.message);
      }
    }

    function deleteReplyRecursive(replies, replyId) {
      return replies
        .filter((r) => !(r.id === replyId && r.user === currentUserName()))
        .map((r) => ({
          ...r,
          replies: r.replies ? deleteReplyRecursive(r.replies, replyId) : [],
        }));
    }

    window.deleteReply = deleteReplyBackend;

    function findReplyById(replies, replyId) {
      for (const r of replies) {
        if (r.id === replyId) return r;
        if (r.replies) {
          const found = findReplyById(r.replies, replyId);
          if (found) return found;
        }
      }
      return null;
    }

    function enableReplyEditBackend(replyId, oldText) {
      const replyCard = [...document.querySelectorAll(".reply-card")]
        .find(c => c.querySelector("p")?.textContent.includes(oldText));
      if (!replyCard) return;

      const existingText = replyCard.querySelector("p");
      if (existingText) existingText.remove();

      const textarea = document.createElement("textarea");
      textarea.value = oldText;
      textarea.style.width = "100%";
      textarea.style.marginTop = "10px";

      const saveBtn = document.createElement("button");
      saveBtn.textContent = "Save";
      saveBtn.style.marginTop = "8px";

      saveBtn.onclick = async () => {
        const newText = textarea.value.trim();
        if (!newText || newText === oldText) return;

        const user = getCurrentUser();
        const token = localStorage.getItem("token");

        try {
          const res = await fetch(`${API_BASE}/api/replies/${replyId}?userId=${user.id}&text=${encodeURIComponent(newText)}`, {
            method: "PUT",
            headers: { "Authorization": `Bearer ${token}` }
          });

          if (!res.ok) throw new Error("Failed to edit reply");

          await loadQueries();
        } catch (err) {
          alert("Error: " + err.message);
        }
      };

      replyCard.insertBefore(textarea, replyCard.querySelector(".reply-actions"));
      replyCard.insertBefore(saveBtn, replyCard.querySelector(".reply-actions"));
    }

    function renderReplies(replies, queryId, depth = 0) {
      const container = document.createElement("div");
      container.className = "nested-replies";

      replies.forEach((reply) => {
        const replyCard = document.createElement("div");
        replyCard.className = "reply-card";
        replyCard.style.marginLeft = `${depth * 20}px`;

        const replyText = document.createElement("p");
                replyText.innerHTML = `<strong>${reply.userName || "Anonymous"}:</strong> ${reply.text}`;
        replyCard.appendChild(replyText);

        const actions = document.createElement("div");
        actions.className = "reply-actions";
        const voteKey = `vote_reply_${reply.id}`;
        const currentUser = currentUserName();
        let voteData = JSON.parse(localStorage.getItem(voteKey) || "{}");
        const currentVote = voteData[currentUser] || null;

        const upvoteBtn = document.createElement("button");
        upvoteBtn.innerHTML = "⬆";
        upvoteBtn.className = "upvote-btn";

        const upvoteCount = document.createElement("span");
        upvoteCount.textContent = reply.likes || 0;

        const downvoteBtn = document.createElement("button");
        downvoteBtn.innerHTML = "⬇";
        downvoteBtn.className = "downvote-btn";

        const downvoteCount = document.createElement("span");
        downvoteCount.textContent = reply.dislikes || 0;

        function updateVoteStyles() {
          upvoteBtn.classList.remove("active-vote");
          downvoteBtn.classList.remove("active-vote", "downvote");

          if (voteData[currentUser] === "like") {
            upvoteBtn.classList.add("active-vote");
          } else if (voteData[currentUser] === "dislike") {
            downvoteBtn.classList.add("active-vote", "downvote");
          }
        }

        async function handleVote(type) {
          if (!isLoggedIn()) return alert("Please log in to vote.");
          const user = getCurrentUser();
          const token = localStorage.getItem("token");

          const current = voteData[currentUser] || null;
          const voteType = current === type ? "none" : type;

          try {
            const res = await fetch(`${API_BASE}/api/replies/${reply.id}/vote?userId=${user.id}&type=${voteType}`, {
              method: "POST",
              headers: { "Authorization": `Bearer ${token}` }
            });

            if (!res.ok) throw new Error("Vote failed");

            const updated = await res.json();

            upvoteCount.textContent = updated.likes;
            downvoteCount.textContent = updated.dislikes;

            voteData[currentUser] = voteType === "none" ? null : type;
            localStorage.setItem(voteKey, JSON.stringify(voteData));
            updateVoteStyles();
          } catch (err) {
            alert("Voting failed: " + err.message);
          }
        }

        upvoteBtn.onclick = () => handleVote("like");
        downvoteBtn.onclick = () => handleVote("dislike");

        updateVoteStyles();

        actions.appendChild(upvoteBtn);
        actions.appendChild(upvoteCount);
        actions.appendChild(downvoteBtn);
        actions.appendChild(downvoteCount);

        const replyBtn = document.createElement('button');
        replyBtn.innerHTML = "☁️";
        replyBtn.title = "Reply to this";
        replyBtn.style.fontSize = "16px";
        replyBtn.style.cursor = "pointer";
        replyBtn.onclick = () => showNestedReplyInput(queryId, reply.id);
        actions.appendChild(replyBtn);

        replyCard.appendChild(actions);

        const nestedInput = document.createElement("div");
        nestedInput.id = `nestedReplyInput_${queryId}_${reply.id}`;
        nestedInput.className = "reply-input";
        nestedInput.style.display = "none";
        nestedInput.innerHTML = `
          <input type="text" placeholder="Write your reply..." />
          <button>Reply</button>
        `;

        const replySubmitBtn = nestedInput.querySelector("button");
        replySubmitBtn.addEventListener("click", () => submitNestedReply(queryId, reply.id));

        replyCard.appendChild(nestedInput);

        if (reply.userId === getCurrentUser()?.id) {
          const replyActions = document.createElement("div");
          replyActions.className = "query-actions";

          const editBtn = document.createElement("button");
          editBtn.textContent = "Edit";
          editBtn.onclick = () => enableReplyEditBackend(reply.id, reply.text);

          const deleteBtn = document.createElement("button");
          deleteBtn.textContent = "Delete";
          deleteBtn.onclick = () => deleteReplyBackend(reply.id);

          replyActions.appendChild(editBtn);
          replyActions.appendChild(deleteBtn);
          replyCard.appendChild(replyActions);
        }

        container.appendChild(replyCard);

        if (reply.replies && reply.replies.length > 0) {
          container.appendChild(renderReplies(reply.replies, queryId, depth + 1));
        }
      });

      return container;
    }

    window.showNestedReplyInput = function (queryId, replyId) {
      const inputBox = document.getElementById(`nestedReplyInput_${queryId}_${replyId}`);
      if (inputBox) {
        inputBox.style.display = "flex";
        inputBox.style.flexDirection = "column";
      }
    };

    async function submitNestedReply(queryId, replyId) {
      if (!isLoggedIn()) {
        alert("Please log in to reply.");
        return;
      }

      const inputBox = document.getElementById(`nestedReplyInput_${queryId}_${replyId}`);
      if (!inputBox) return;
      const input = inputBox.querySelector("input");
      const text = input.value.trim();
      if (!text) return;

      const user = getCurrentUser();
      const token = localStorage.getItem("token");

      try {
        const res = await fetch(`${API_BASE}/api/replies/${replyId}/reply?userId=${user.id}&text=${encodeURIComponent(text)}`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}` }
        });

        if (!res.ok) throw new Error("Failed to post nested reply");
        await loadQueries();
      } catch (err) {
        alert("Error: " + err.message);
      }
    }

    window.submitNestedReply = submitNestedReply;

   function formatIndianDate(dateStr) {
  if (!dateStr) return "Unknown";

  // Force UTC interpretation if backend omits timezone
  const d = new Date(dateStr.endsWith("Z") ? dateStr : dateStr + "Z");
  if (isNaN(d)) return "Unknown";

  // Convert to IST (UTC + 5:30)
  const istOffset = 5.5 * 60; // minutes
  const localTime = new Date(d.getTime() + istOffset * 60000);

  const day = String(localTime.getDate()).padStart(2, '0');
  const month = String(localTime.getMonth() + 1).padStart(2, '0');
  const year = localTime.getFullYear();
  const hours = String(localTime.getHours()).padStart(2, '0');
  const minutes = String(localTime.getMinutes()).padStart(2, '0');

  return `${day}-${month}-${year} ${hours}:${minutes}`;
}


    function enableQueryEditBackend(queryId, oldText) {
      const card = [...document.querySelectorAll(".query-card")]
        .find(c => c.querySelector(".query-text")?.textContent === oldText);
      if (!card) return;

      const textarea = document.createElement("textarea");
      textarea.className = "edit-query-box";
      textarea.value = oldText;
      textarea.style.width = "100%";
      textarea.style.marginTop = "10px";

      const saveBtn = document.createElement("button");
      saveBtn.textContent = "Save";
      saveBtn.onclick = async () => {
        const newText = textarea.value.trim();
        if (!newText) return;

        const user = getCurrentUser();
        const token = localStorage.getItem("token");

        try {
          const res = await fetch(`${API_BASE}/api/queries/${queryId}?userId=${user.id}&text=${encodeURIComponent(newText)}`, {
            method: "PUT",
            headers: { "Authorization": `Bearer ${token}` }
          });

          if (!res.ok) throw new Error("Failed to edit query");
          await loadQueries();
        } catch (err) {
          alert("Error: " + err.message);
        }
      };

      card.querySelector(".query-text").remove();
      card.insertBefore(textarea, card.querySelector(".replies-section"));
      card.insertBefore(saveBtn, card.querySelector(".replies-section"));
    }

    async function deleteQueryBackend(queryId) {
      const user = getCurrentUser();
      const token = localStorage.getItem("token");

      try {
        const res = await fetch(`${API_BASE}/api/queries/${queryId}?userId=${user.id}`, {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${token}` }
        });

        if (!res.ok) throw new Error("Failed to delete query");
        await loadQueries();
      } catch (err) {
        alert("Error: " + err.message);
      }
    }
function renderQueriesFromBackend(allQueries) {
  queryListContainer.innerHTML = "";
  const user = getCurrentUser();

  allQueries.forEach((q, index) => {
    const card = document.createElement("div");
    card.className = "query-card";

    const formattedTime = formatIndianDate(q.timestamp);

    const metaRow = document.createElement("div");
    metaRow.style.display = "flex";
    metaRow.style.justifyContent = "space-between";
    metaRow.style.alignItems = "center";

    const metaText = document.createElement("p");
    metaText.className = "query-meta";
    metaText.textContent = `${q.userName || 'Anonymous'} • ${formattedTime}`;
    metaText.style.margin = "0";
    metaRow.appendChild(metaText);

   const actions = document.createElement("div");
actions.className = "query-actions";

if (q.userId === user?.id) {
  const editBtn = document.createElement("button");
  editBtn.textContent = "Edit";
  editBtn.onclick = () => enableQueryEditBackend(q.id, q.text);

  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "Delete";
  deleteBtn.onclick = () => deleteQueryBackend(q.id);

  actions.appendChild(editBtn);
  actions.appendChild(deleteBtn);
} else {
  const reportIcon = document.createElement("img");
  reportIcon.src = "Flag.png";
  reportIcon.alt = "Report";
  reportIcon.className = "report-icon";
  reportIcon.title = "Report this query";
  reportIcon.onclick = () => reportQuery(q.id);

  actions.appendChild(reportIcon);
}

metaRow.appendChild(actions);


    card.appendChild(metaRow);

    const queryText = document.createElement("p");
    queryText.className = "query-text";

    // ✅ Hide query if reported too many times
    if ((q.reportCount || 0) >= 5) {
      queryText.textContent = "⚠️ This query has been reported multiple times and is hidden.";
      card.appendChild(queryText);
      queryListContainer.appendChild(card);
      return;
    }

    queryText.textContent = q.text;
    card.appendChild(queryText);

    const reportBtn = document.createElement("button");
    

    const replySection = document.createElement("div");
    replySection.className = "replies-section";
    replySection.appendChild(renderReplies(q.replies || [], q.id));
    card.appendChild(replySection);

    const replyInput = document.createElement("div");
    replyInput.className = "reply-input";
    replyInput.innerHTML = `
      <input type="text" placeholder="Write your reply..." id="replyInput${index}" />
      <button class="submit-reply-btn">Reply</button>
    `;
    replyInput.querySelector(".submit-reply-btn").addEventListener("click", () => {
      const replyText = document.getElementById(`replyInput${index}`).value.trim();
      if (replyText) submitReplyBackend(q.id, replyText);
    });

    card.appendChild(replyInput);
    queryListContainer.appendChild(card);
  });
}

    searchInput?.addEventListener("input", loadQueries);
    sortSelect?.addEventListener("change", loadQueries);

    if (localStorage.getItem("redirectAfterLogin") === "queries") {
      if (isLoggedIn()) {
        queryFormContainer.style.display = "block";
      }
      localStorage.removeItem("redirectAfterLogin");
    }

    loadQueries();
  });
})();
