(() => {
  // --- Helper shortcuts ---
  const $ = (id) => document.getElementById(id);
  const toast = (msg, time = 2500) => {
    const t = $("toast");
    t.textContent = msg;
    t.classList.remove("hide");
    clearTimeout(t._t);
    t._t = setTimeout(() => t.classList.add("hide"), time);
  };

  const uid = () => "C" + Date.now().toString(36).toUpperCase().slice(-8);

  const STORAGE = {
    users: "cms_users_v1",
    complaints: "cms_complaints_v1",
  };

  const load = (k, def = []) =>
    JSON.parse(localStorage.getItem(k) || JSON.stringify(def));
  const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));

  // --- Ensure default admin user ---
  const ensureAdmin = () => {
    let users = load(STORAGE.users);
    const adminEmail = "admin@cms.local";
    if (!users.some((u) => u.email === adminEmail)) {
      users.push({
        name: "Admin",
        email: adminEmail,
        password: "admin123",
        role: "admin",
      });
      save(STORAGE.users, users);
    }
  };
  ensureAdmin();

  // --- Application State ---
  let state = {
    users: load(STORAGE.users),
    complaints: load(STORAGE.complaints),
    currentUser: null,
  };

  // --- Navigation sections ---
  const pages = {
    home: $("home-section"),
    submit: $("submit-section"),
    my: $("mycomplaints-section"),
    admin: $("admin-section"),
  };

  function showPage(p) {
    Object.values(pages).forEach((pg) => pg.classList.add("hide"));
    pages[p].classList.remove("hide");

    if (state.currentUser) {
      $("logout-btn").classList.remove("hide");
      $("user-welcome").textContent = `Hello, ${state.currentUser.name}`;
      $("auth-forms").classList.add("hide");
    } else {
      $("logout-btn").classList.add("hide");
      $("user-welcome").textContent = "";
      $("auth-forms").classList.remove("hide");
    }

    if (p === "my") renderMyComplaints();
    if (p === "admin") renderAdmin();
  }

  // --- Navigation buttons ---
  $("nav-home").onclick = () => showPage("home");
  $("nav-submit").onclick = () =>
    state.currentUser ? showPage("submit") : toast("Please login first!");
  $("nav-mycomplaints").onclick = () =>
    state.currentUser ? showPage("my") : toast("Login required!");
  $("nav-admin").onclick = () =>
    state.currentUser && state.currentUser.role === "admin"
      ? showPage("admin")
      : toast("Admin access only!");

  $("logout-btn").onclick = () => {
    state.currentUser = null;
    toast("Logged out successfully!");
    showPage("home");
  };

  // --- Register ---
  $("register-btn").onclick = () => {
    const name = $("reg-name").value.trim();
    const email = $("reg-email").value.trim().toLowerCase();
    const password = $("reg-password").value.trim();

    if (!name || !email || !password)
      return toast("All fields are required!");

    if (state.users.some((u) => u.email === email))
      return toast("Email already registered!");

    state.users.push({ name, email, password, role: "user" });
    save(STORAGE.users, state.users);
    toast("Registration successful. Please login now!");
  };

  // --- Login ---
  $("login-btn").onclick = () => {
    const email = $("login-email").value.trim().toLowerCase();
    const password = $("login-password").value.trim();

    const user = state.users.find(
      (u) => u.email === email && u.password === password
    );
    if (!user) return toast("Invalid login credentials!");

    state.currentUser = { name: user.name, email: user.email, role: user.role };
    toast(`Welcome, ${user.name}!`);
    showPage("submit");
  };

  // --- Submit Complaint ---
  $("complaint-form").onsubmit = (e) => {
    e.preventDefault();
    if (!state.currentUser) return toast("Please login first!");

    const title = $("complaint-title").value.trim();
    const category = $("complaint-category").value;
    const desc = $("complaint-desc").value.trim();
    const attach = $("complaint-attach").value.trim();

    if (!title || !desc) return toast("Please fill in all required fields!");

    const c = {
      id: uid(),
      title,
      category,
      description: desc,
      attachment: attach,
      userEmail: state.currentUser.email,
      userName: state.currentUser.name,
      status: "Pending",
      createdAt: new Date().toISOString(),
    };

    state.complaints.unshift(c);
    save(STORAGE.complaints, state.complaints);

    e.target.reset();
    toast("Complaint submitted successfully!");
    showPage("my");
  };

  // --- Render My Complaints ---
  function renderMyComplaints() {
    const list = $("mycomplaints-list");
    list.innerHTML = "";
    const myComps = state.complaints.filter(
      (c) => c.userEmail === state.currentUser.email
    );

    if (!myComps.length)
      return (list.innerHTML = "<p class='meta'>No complaints yet.</p>");

    myComps.forEach((c) => list.appendChild(makeItem(c, false)));
  }

  // --- Render Admin Complaints ---
  function renderAdmin() {
    const list = $("admin-list");
    list.innerHTML = "";
    if (!state.complaints.length)
      return (list.innerHTML = "<p class='meta'>No complaints yet.</p>");
    state.complaints.forEach((c) => list.appendChild(makeItem(c, true)));
  }

  // --- Create Complaint Card ---
  function makeItem(c, admin) {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <div class="left">
        <strong>${c.title}</strong> <span class="tag">${c.category}</span>
        <div class="meta">ID: ${c.id} | ${new Date(
      c.createdAt
    ).toLocaleString()}</div>
        <p>${c.description}</p>
        ${
          c.attachment
            ? `<a href="${c.attachment}" target="_blank" class="meta">Attachment</a>`
            : ""
        }
      </div>
    `;

    const right = document.createElement("div");
    right.className = "row";

    if (admin) {
      const sel = document.createElement("select");
      ["Pending", "In Progress", "Resolved"].forEach((s) => {
        const o = document.createElement("option");
        o.value = s;
        o.text = s;
        if (c.status === s) o.selected = true;
        sel.appendChild(o);
      });
      sel.onchange = () => {
        c.status = sel.value;
        save(STORAGE.complaints, state.complaints);
        toast(`Status updated to ${sel.value}`);
      };
      right.appendChild(sel);
    } else {
      const st = document.createElement("span");
      st.className = "meta";
      st.textContent = c.status;
      right.appendChild(st);
    }

    div.appendChild(right);
    return div;
  }

  // --- Initialize ---
  showPage("home");
})();