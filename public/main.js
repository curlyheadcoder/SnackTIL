document.addEventListener("DOMContentLoaded", () => {
  const factsList = document.querySelector(".facts-list");
  let currentCategory = "all";
  const form = document.getElementById("factForm");
  const imageInput = document.getElementById("imageUpload");
  const imageLabel = document.querySelector(".file-upload-label");
  const categoryButtons = document.querySelectorAll(".category-btn");

  // Show selected file name next to upload button
  imageInput.addEventListener("change", () => {
    if (imageInput.files.length > 0) {
      imageLabel.textContent = `📁 ${imageInput.files[0].name}`;
    } else {
      imageLabel.textContent = "📁 Upload Image";
    }
  });

  // Fetch and render facts, filtered by category if needed
  async function fetchFacts() {
    try {
      const res = await fetch("/api/facts");
      if (!res.ok) throw new Error("Failed to fetch facts");
      let facts = await res.json();

      const filteredFacts =
        currentCategory === "all"
          ? facts
          : facts.filter((fact) => fact.category === currentCategory);

      renderFacts(filteredFacts);
    } catch (error) {
      console.error("Error fetching facts:", error);
      factsList.innerHTML =
        "<li style='padding:20px; text-align:center; color: red;'>Failed to load facts.</li>";
    }
  }

  // Render facts list with image on top and text below
  function renderFacts(facts) {
    factsList.innerHTML = "";
    if (!facts.length) {
      factsList.innerHTML =
        "<li style='padding:32px;text-align:center;'>No facts found.</li>";
      return;
    }
    facts.forEach((fact) => {
      const li = document.createElement("li");
      li.className = "fact-tile";
      li.innerHTML = `
        <div class="fact-row">
          ${
            fact.image
              ? `<img src="${fact.image}" alt="fact image" class="fact-image">`
              : ""
          }
          <span class="fact-text">
            ${fact.summary}
            <span class="tag ${fact.category}">#${fact.category}#</span>
            ${
              fact.source
                ? `<br/><a href="${fact.source}" target="_blank" rel="noopener">(Source)</a>`
                : ""
            }
          </span>
          <div class="reactions">
            <button class="reaction-btn" data-type="likes" data-id="${
              fact.id
            }">👍<strong>${fact.likes}</strong></button>
            <button class="reaction-btn" data-type="mindblown" data-id="${
              fact.id
            }">🤯<strong>${fact.mindblown}</strong></button>
            <button class="reaction-btn" data-type="wrong" data-id="${
              fact.id
            }">⛔<strong>${fact.wrong}</strong></button>
          </div>
        </div>
      `;
      factsList.appendChild(li);
    });
  }

  // Handle reaction button clicks
  factsList.addEventListener("click", async (e) => {
    const btn = e.target.closest(".reaction-btn");
    if (!btn) return;

    const factId = btn.getAttribute("data-id");
    const type = btn.getAttribute("data-type");

    try {
      const res = await fetch(`/api/facts/${factId}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      if (!res.ok) throw new Error("Failed to update reaction");
      fetchFacts(); // Refresh after reaction update
    } catch (error) {
      alert("Failed to update reaction: " + error.message);
    }
  });

  // Handle category filter buttons
  categoryButtons.forEach((button) => {
    button.addEventListener("click", () => {
      currentCategory = button.getAttribute("data-category");
      fetchFacts();
    });
  });

  // Handle form submission to add new fact
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(form);

    try {
      const response = await fetch("/api/facts", {
        method: "POST",
        body: formData, // FormData includes text and image data
      });

      if (response.ok) {
        form.reset();
        imageLabel.textContent = "📁 Upload Image";
        fetchFacts();
        alert("Fact added successfully!");
      } else {
        alert("Failed to add fact!");
      }
    } catch (error) {
      alert("Error: " + error.message);
    }
  });

  // Initial facts fetch
  fetchFacts();
});
