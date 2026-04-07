document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const searchInput = document.getElementById("search-input");
  const categoryFilter = document.getElementById("category-filter");
  const sortSelect = document.getElementById("sort-select");

  let allActivities = {};
  let statsChart = null;

  // Render a (filtered/sorted) subset of activities
  function renderActivities(filtered) {
    activitiesList.innerHTML = "";
    activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

    if (Object.keys(filtered).length === 0) {
      activitiesList.innerHTML = "<p>No activities match your search.</p>";
      return;
    }

    Object.entries(filtered).forEach(([name, details]) => {
      const activityCard = document.createElement("div");
      activityCard.className = "activity-card";

      const spotsLeft = details.max_participants - details.participants.length;

      const participantsHTML =
        details.participants.length > 0
          ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span><button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button></li>`
                  )
                  .join("")}
              </ul>
            </div>`
          : `<p><em>No participants yet</em></p>`;

      activityCard.innerHTML = `
        <div class="activity-card-header">
          <h4>${name}</h4>
          ${details.category ? `<span class="category-badge">${details.category}</span>` : ""}
        </div>
        <p>${details.description}</p>
        <p><strong>Schedule:</strong> ${details.schedule}</p>
        <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
        <div class="participants-container">
          ${participantsHTML}
        </div>
      `;

      activitiesList.appendChild(activityCard);

      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      activitySelect.appendChild(option);
    });

    document.querySelectorAll(".delete-btn").forEach((button) => {
      button.addEventListener("click", handleUnregister);
    });
  }

  // Apply current toolbar state and re-render
  function applyFilters() {
    const searchTerm = searchInput.value.toLowerCase();
    const category = categoryFilter.value;
    const sortBy = sortSelect.value;

    let entries = Object.entries(allActivities);

    if (searchTerm) {
      entries = entries.filter(
        ([name, details]) =>
          name.toLowerCase().includes(searchTerm) ||
          details.description.toLowerCase().includes(searchTerm)
      );
    }

    if (category) {
      entries = entries.filter(([, details]) => details.category === category);
    }

    entries.sort(([nameA, detailsA], [nameB, detailsB]) => {
      switch (sortBy) {
        case "name-asc":
          return nameA.localeCompare(nameB);
        case "name-desc":
          return nameB.localeCompare(nameA);
        case "spots-desc":
          return (
            detailsB.max_participants -
            detailsB.participants.length -
            (detailsA.max_participants - detailsA.participants.length)
          );
        case "spots-asc":
          return (
            detailsA.max_participants -
            detailsA.participants.length -
            (detailsB.max_participants - detailsB.participants.length)
          );
        default:
          return nameA.localeCompare(nameB);
      }
    });

    renderActivities(Object.fromEntries(entries));
  }

  // Fetch all activities from the API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      allActivities = await response.json();
      applyFilters();
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Fetch and render participation statistics
  async function fetchStats() {
    try {
      const response = await fetch("/stats");
      const stats = await response.json();

      document.getElementById("stat-total-activities").textContent =
        stats.total_activities;
      document.getElementById("stat-total-participants").textContent =
        stats.total_participants;
      document.getElementById("stat-total-capacity").textContent =
        stats.total_capacity;
      document.getElementById("stat-fill-rate").textContent =
        stats.fill_rate + "%";

      const labels = stats.activities.map((a) => a.name);
      const participantCounts = stats.activities.map((a) => a.participants);
      const capacities = stats.activities.map((a) => a.max_participants);

      const ctx = document.getElementById("stats-chart").getContext("2d");
      if (statsChart) {
        statsChart.destroy();
      }
      statsChart = new Chart(ctx, {
        type: "bar",
        data: {
          labels,
          datasets: [
            {
              label: "Participants",
              data: participantCounts,
              backgroundColor: "rgba(26, 35, 126, 0.75)",
              borderColor: "rgba(26, 35, 126, 1)",
              borderWidth: 1,
            },
            {
              label: "Capacity",
              data: capacities,
              backgroundColor: "rgba(57, 73, 171, 0.25)",
              borderColor: "rgba(57, 73, 171, 0.8)",
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: true,
              ticks: { stepSize: 1 },
            },
            x: {
              ticks: { maxRotation: 30, minRotation: 15 },
            },
          },
          plugins: {
            legend: { position: "top" },
            title: {
              display: true,
              text: "Participants vs. Capacity per Activity",
            },
          },
        },
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        await fetchActivities();
        await fetchStats();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        await fetchActivities();
        await fetchStats();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Toolbar event listeners
  searchInput.addEventListener("input", applyFilters);
  categoryFilter.addEventListener("change", applyFilters);
  sortSelect.addEventListener("change", applyFilters);

  // Initialize
  fetchActivities();
  fetchStats();
});
