document.addEventListener("DOMContentLoaded", () => {
  const factsList = document.querySelector(".facts-list");
  let currentCategory = "all";
  let page = 1;
  let loading = false;
  let endReached = false;

  const form = document.getElementById("factForm");
  const imageInput = document.getElementById("imageUpload");
  const imageLabel = document.querySelector(".file-upload-label");
  const categoryButtons = document.querySelectorAll(".category-btn");

  function formatUrl(url) {
    if (!url) return "#";
    return url.startsWith("http://") || url.startsWith("https://")
      ? url
      : `https://${url}`;
  }

  // Enhanced category mapping function
  function mapNewsCategory(apiCategory = "", title = "", description = "") {
    const all = (apiCategory + " " + title + " " + description).toLowerCase();

    if (/(sport|cricket|football|olympic|nba|fifa)\b/.test(all))
      return "sports";
    if (
      /(politic|government|minister|senate|election|parliament|bjp|congress|democrat|republican)\b/.test(
        all
      )
    )
      return "politics";
    if (
      /(technology|tech|computer|ai|software|robot|gadget|internet|startup)/.test(
        all
      )
    )
      return "technology";
    if (/(history|historic|archaeolog|heritage|century|ancient)/.test(all))
      return "history";
    if (
      /(science|physics|chemistry|biology|discovery|space|research|scientist)/.test(
        all
      )
    )
      return "science";
    if (
      /(art|music|painting|culture|entertain|theatre|cinema|movie|artist)/.test(
        all
      )
    )
      return "art";
    if (
      /(society|community|lifestyle|crime|health|wellness|medicine|covid|doctor|hospital|education|school|college)/.test(
        all
      )
    )
      return "society";
    if (
      /(world|global|globe|earth|international|nation|country|abroad)/.test(
        apiCategory
      )
    )
      return "globe";
    return "society";
  }

  function ensureFactCategory(fact) {
    const valid = [
      "technology",
      "sports",
      "society",
      "politics",
      "history",
      "science",
      "art",
      "globe",
    ];
    if (valid.includes(fact.category)) return fact.category;
    return mapNewsCategory("", (fact.summary || "") + " " + (fact.title || ""));
  }

  // Update file input label on choose
  imageInput.addEventListener("change", () => {
    imageLabel.textContent =
      imageInput.files.length > 0
        ? `📁 ${imageInput.files[0].name}`
        : "📁 Upload Image";
  });

  // Fetch news batch
  async function fetchNewsBatch(page, category) {
    const apiKey = "Knk8t3DnoIwkNWpTfuXmPC2WUQJo16L3yh2uPYOE";
    let url = `https://api.thenewsapi.com/v1/news/top?api_token=${apiKey}&language=en&page=${page}&limit=8`;

    try {
      const res = await fetch(url);
      if (!res.ok) return [];
      const { data } = await res.json();
      let arr = data.map((n) => ({
        id:
          "news-" +
          btoa((n.url || n.title || Date.now().toString()).substring(0, 35)),
        summary: n.title || "No title",
        image: n.image_url || "https://via.placeholder.com/320x180?text=News",
        source: n.url,
        category: mapNewsCategory(n.category, n.title, n.description),
        likes: 0,
        mindblown: 0,
        wrong: 0,
        isNews: true,
      }));
      if (category !== "all") arr = arr.filter((x) => x.category === category);
      return arr;
    } catch (e) {
      console.error("News fetch error", e);
      return [];
    }
  }

  // Fetch facts batch (frontend paginated)
  async function fetchFactsBatch(page, category) {
    try {
      const res = await fetch("/api/facts");
      if (!res.ok) return [];
      let facts = await res.json();
      facts = facts.map((f) => ({
        ...f,
        summary: f.summary || "",
        image: f.image || "https://via.placeholder.com/320x180?text=Fact",
        source: f.source || "",
        category: ensureFactCategory(f),
        likes: f.likes || 0,
        mindblown: f.mindblown || 0,
        wrong: f.wrong || 0,
        isNews: false,
      }));
      if (category !== "all")
        facts = facts.filter((f) => f.category === category);
      return facts.slice((page - 1) * 8, page * 8);
    } catch (e) {
      console.error("Fact fetch error", e);
      return [];
    }
  }

  // Render facts + news
  function renderFacts(items, clear = false) {
    if (clear) factsList.innerHTML = "";
    if (!items.length && factsList.innerHTML === "") {
      factsList.innerHTML =
        "<li style='padding:32px;text-align:center;'>No news or facts found.</li>";
      return;
    }
    items.forEach((item) => {
      const li = document.createElement("li");
      li.className = "fact-tile";
      // Attach click listener on li itself to open source URL
      li.style = "cursor: pointer;";

      // Use pointerEvents none on buttons themselves so click on them doesn't trigger li click
      li.innerHTML = `
        <div class="fact-row" style="pointer-events: none;">
          ${
            item.image
              ? `<img src="${item.image}" alt="image" class="fact-image" style="margin-bottom:10px; max-width:100%; max-height:180px; object-fit: cover; border-radius:10px;" />`
              : ""
          }
          <span class="fact-text">
            ${item.summary}
            <span class="tag ${item.category || "society"}">#${
        item.category || "society"
      }#</span>
          </span>
          <div class="reactions" style="pointer-events: auto;">
            <button class="reaction-btn" data-type="likes" data-id="${
              item.id
            }">👍<strong>${item.likes || 0}</strong></button>
            <button class="reaction-btn" data-type="mindblown" data-id="${
              item.id
            }">🤯<strong>${item.mindblown || 0}</strong></button>
            <button class="reaction-btn" data-type="wrong" data-id="${
              item.id
            }">⛔<strong>${item.wrong || 0}</strong></button>
          </div>
        </div>
      `;

      // Click whole card opens source in new tab
      li.addEventListener("click", () => {
        if (item.source) {
          window.open(formatUrl(item.source), "_blank", "noopener");
        }
      });

      factsList.appendChild(li);
    });

    restoreNewsReactions();
  }

  // Load next page
  let batchPage = 1;
  let loadingFeed = false;
  let feedEnd = false;
  let items = [];

  async function loadNextPage() {
    if (loadingFeed || feedEnd) return;
    loadingFeed = true;
    let [news, facts] = await Promise.all([
      fetchNewsBatch(batchPage, currentCategory),
      fetchFactsBatch(batchPage, currentCategory),
    ]);
    let thisBatch = [...news, ...facts];
    // Shuffle
    for (let i = thisBatch.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [thisBatch[i], thisBatch[j]] = [thisBatch[j], thisBatch[i]];
    }
    if (!thisBatch.length) feedEnd = true;
    if (batchPage === 1) items = [];
    items.push(...thisBatch);
    renderFacts(thisBatch, batchPage === 1);
    batchPage++;
    loadingFeed = false;
  }

  window.addEventListener("scroll", () => {
    if (
      window.innerHeight + window.scrollY >= document.body.offsetHeight - 400 &&
      !loadingFeed &&
      !feedEnd
    ) {
      loadNextPage();
    }
  });

  // Reaction handler (facts backend, news localStorage)
  function handleReactionClick(e) {
    const btn = e.target.closest(".reaction-btn");
    if (!btn) return;
    e.stopPropagation(); // prevent li click event

    const id = btn.getAttribute("data-id");
    const type = btn.getAttribute("data-type");

    if (id.startsWith("news-")) {
      const strongTag = btn.querySelector("strong");
      let count = parseInt(strongTag.textContent) || 0;
      count++;
      strongTag.textContent = count;
      let stored = JSON.parse(localStorage.getItem("newsReactions") || "{}");
      if (!stored[id]) stored[id] = {};
      stored[id][type] = count;
      localStorage.setItem("newsReactions", JSON.stringify(stored));
      return;
    }

    // Facts: backend update
    fetch(`/api/facts/${id}/react`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to update reaction");
        // optimistic update
        let strongEl = btn.querySelector("strong");
        strongEl.textContent = parseInt(strongEl.textContent) + 1;
      })
      .catch((err) => alert("Failed to update reaction: " + err.message));
  }
  factsList.addEventListener("click", handleReactionClick);

  // Restore local news reactions on UI from localStorage
  function restoreNewsReactions() {
    const storedReactions = JSON.parse(
      localStorage.getItem("newsReactions") || "{}"
    );
    Object.entries(storedReactions).forEach(([id, reactions]) => {
      ["likes", "mindblown", "wrong"].forEach((type) => {
        const btn = factsList.querySelector(
          `button[data-id="${id}"][data-type="${type}"]`
        );
        if (btn && reactions[type] !== undefined) {
          btn.querySelector("strong").textContent = reactions[type];
        }
      });
    });
  }

  // Category filter handlers
  categoryButtons.forEach((button) => {
    button.addEventListener("click", () => {
      currentCategory = button.getAttribute("data-category");
      batchPage = 1;
      feedEnd = false;
      loadingFeed = false;
      items = [];
      factsList.innerHTML = "";
      loadNextPage();
    });
  });

  // Share a Fact form submit
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);

    try {
      const response = await fetch("/api/facts", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        form.reset();
        imageLabel.textContent = "📁 Upload Image";
        batchPage = 1;
        feedEnd = false;
        loadingFeed = false;
        items = [];
        factsList.innerHTML = "";
        loadNextPage();
        alert("Fact added successfully!");
      } else {
        alert("Failed to add fact!");
      }
    } catch (error) {
      alert("Error: " + error.message);
    }
  });

  // Initial load
  loadNextPage();
});
