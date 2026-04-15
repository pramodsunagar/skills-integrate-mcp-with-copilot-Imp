/**
 * app.js
 * Main client-side script for managing activity sign-ups and unregistrations.
 */

const MESSAGE_DISPLAY_DURATION_MS = 5000;
const API_BASE_URL = "";

/**
 * Builds the HTML string for the participants section of an activity card.
 * @param {string[]} participants - Array of participant email addresses.
 * @param {string} activityName - Name of the activity.
 * @returns {string} HTML string for the participants section.
 */
function buildParticipantsHTML(participants, activityName) {
  if (participants.length === 0) {
    return `<p><em>No participants yet</em></p>`;
  }

  const participantItems = participants
    .map(
      (email) =>
        `<li>
          <span class="participant-email">${email}</span>
          <button class="delete-btn" data-activity="${activityName}" data-email="${email}">❌</button>
        </li>`
    )
    .join("");

  return `
    <div class="participants-section">
      <h5>Participants:</h5>
      <ul class="participants-list">
        ${participantItems}
      </ul>
    </div>`;
}

/**
 * Creates an activity card DOM element.
 * @param {string} activityName - Name of the activity.
 * @param {Object} activityDetails - Details of the activity.
 * @returns {HTMLDivElement} The activity card element.
 */
function createActivityCard(activityName, activityDetails) {
  const { description, schedule, max_participants, participants } = activityDetails;
  const spotsLeft = max_participants - participants.length;
  const participantsHTML = buildParticipantsHTML(participants, activityName);

  const activityCard = document.createElement("div");
  activityCard.className = "activity-card";
  activityCard.innerHTML = `
    <h4>${activityName}</h4>
    <p>${description}</p>
    <p><strong>Schedule:</strong> ${schedule}</p>
    <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
    <div class="participants-container">
      ${participantsHTML}
    </div>
  `;

  return activityCard;
}

/**
 * Displays a feedback message to the user and hides it after a set duration.
 * @param {HTMLElement} messageElement - The element to display the message in.
 * @param {string} text - The message text.
 * @param {"success"|"error"} type - The type of message.
 */
function showMessage(messageElement, text, type) {
  messageElement.textContent = text;
  messageElement.className = type;
  messageElement.classList.remove("hidden");

  setTimeout(() => {
    messageElement.classList.add("hidden");
  }, MESSAGE_DISPLAY_DURATION_MS);
}

/**
 * Fetches all activities from the API and renders them in the UI.
 * Also populates the activity dropdown for sign-up.
 * @param {HTMLElement} activitiesListElement - Container for activity cards.
 * @param {HTMLSelectElement} activitySelectElement - Dropdown for activity selection.
 * @param {HTMLElement} messageElement - Element for displaying status messages.
 */
async function fetchAndRenderActivities(activitiesListElement, activitySelectElement, messageElement) {
  try {
    const response = await fetch(`${API_BASE_URL}/activities`);
    const activities = await response.json();

    activitiesListElement.innerHTML = "";
    activitySelectElement.innerHTML = "";

    Object.entries(activities).forEach(([activityName, activityDetails]) => {
      const activityCard = createActivityCard(activityName, activityDetails);
      activitiesListElement.appendChild(activityCard);

      const option = document.createElement("option");
      option.value = activityName;
      option.textContent = activityName;
      activitySelectElement.appendChild(option);
    });

    document.querySelectorAll(".delete-btn").forEach((deleteButton) => {
      deleteButton.addEventListener("click", (event) =>
        handleUnregister(event, activitiesListElement, activitySelectElement, messageElement)
      );
    });
  } catch (error) {
    activitiesListElement.innerHTML =
      "<p>Failed to load activities. Please try again later.</p>";
    console.error("Error fetching activities:", error);
  }
}

/**
 * Handles the unregister (delete) action for a participant.
 * @param {MouseEvent} event - The click event.
 * @param {HTMLElement} activitiesListElement - Container for activity cards.
 * @param {HTMLSelectElement} activitySelectElement - Dropdown for activity selection.
 * @param {HTMLElement} messageElement - Element for displaying status messages.
 */
async function handleUnregister(event, activitiesListElement, activitySelectElement, messageElement) {
  const deleteButton = event.target;
  const activityName = deleteButton.getAttribute("data-activity");
  const participantEmail = deleteButton.getAttribute("data-email");

  try {
    const response = await fetch(
      `${API_BASE_URL}/activities/${encodeURIComponent(activityName)}/unregister?email=${encodeURIComponent(participantEmail)}`,
      { method: "DELETE" }
    );

    const result = await response.json();

    if (response.ok) {
      showMessage(messageElement, result.message, "success");
      await fetchAndRenderActivities(activitiesListElement, activitySelectElement, messageElement);
    } else {
      showMessage(messageElement, result.detail || "An error occurred", "error");
    }
  } catch (error) {
    showMessage(messageElement, "Failed to unregister. Please try again.", "error");
    console.error("Error unregistering:", error);
  }
}

/**
 * Handles the sign-up form submission.
 * @param {SubmitEvent} event - The form submit event.
 * @param {HTMLFormElement} signupFormElement - The sign-up form element.
 * @param {HTMLElement} activitiesListElement - Container for activity cards.
 * @param {HTMLSelectElement} activitySelectElement - Dropdown for activity selection.
 * @param {HTMLElement} messageElement - Element for displaying status messages.
 */
async function handleSignupFormSubmit(
  event,
  signupFormElement,
  activitiesListElement,
  activitySelectElement,
  messageElement
) {
  event.preventDefault();

  const participantEmail = document.getElementById("email").value;
  const selectedActivity = document.getElementById("activity").value;

  try {
    const response = await fetch(
      `${API_BASE_URL}/activities/${encodeURIComponent(selectedActivity)}/signup?email=${encodeURIComponent(participantEmail)}`,
      { method: "POST" }
    );

    const result = await response.json();

    if (response.ok) {
      showMessage(messageElement, result.message, "success");
      signupFormElement.reset();
      await fetchAndRenderActivities(activitiesListElement, activitySelectElement, messageElement);
    } else {
      showMessage(messageElement, result.detail || "An error occurred", "error");
    }
  } catch (error) {
    showMessage(messageElement, "Failed to sign up. Please try again.", "error");
    console.error("Error signing up:", error);
  }
}

/**
 * Initializes the application after the DOM is fully loaded.
 */
document.addEventListener("DOMContentLoaded", () => {
  const activitiesListElement = document.getElementById("activities-list");
  const activitySelectElement = document.getElementById("activity");
  const signupFormElement = document.getElementById("signup-form");
  const messageElement = document.getElementById("message");

  signupFormElement.addEventListener("submit", (event) =>
    handleSignupFormSubmit(
      event,
      signupFormElement,
      activitiesListElement,
      activitySelectElement,
      messageElement
    )
  );

  fetchAndRenderActivities(activitiesListElement, activitySelectElement, messageElement);
});
