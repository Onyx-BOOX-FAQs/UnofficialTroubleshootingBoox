const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwXsjJiJ56MdKNzSBlPNkioXedbO2MYZ-XDAxBirIBvPNd1u1gT7NTMLBxmSK91PC3D/exec";

document.addEventListener("DOMContentLoaded", () => {
  const searchForm = document.getElementById("searchForm");
  const searchInput = document.getElementById("searchInput");
  const searchSuggestions = document.getElementById("searchSuggestions");
  const searchEmptyMessage = document.getElementById("searchEmptyMessage");
  const searchableCards = Array.from(document.querySelectorAll(".searchable-card"));
  const questionForm = document.getElementById("questionForm");
  const questionInput = document.getElementById("questionInput");
  const statusMessage = document.getElementById("statusMessage");
  const feedbackButton = document.getElementById("scrollToFeedback");
  let activeSuggestionIndex = -1;

  const searchItems = searchableCards.map((card, index) => {
    const title = card.querySelector("h3")?.textContent.trim() || "Untitled page";
    const description = card.querySelector("p")?.textContent.trim() || "";
    const keywords = (card.dataset.search || "").trim();
    const sectionLabel = card.closest("#popular") ? "Popular issue" : "Category";
    const fallbackTitle = card.querySelector(".issue-row-link")?.textContent.trim() || title;
    const href =
      card.getAttribute("href") ||
      card.dataset.href ||
      card.querySelector("a")?.getAttribute("href") ||
      "#";

    return {
      id: `search-suggestion-${index}`,
      href,
      title: fallbackTitle,
      description,
      sectionLabel,
      haystack: `${fallbackTitle} ${description} ${keywords}`.toLowerCase()
    };
  });

  const clearSuggestions = () => {
    if (!searchSuggestions || !searchInput) return;

    searchSuggestions.innerHTML = "";
    searchSuggestions.hidden = true;
    searchInput.setAttribute("aria-expanded", "false");
    searchInput.removeAttribute("aria-activedescendant");
    activeSuggestionIndex = -1;
  };

  const setActiveSuggestion = (nextIndex) => {
    if (!searchSuggestions) return;

    const suggestionButtons = Array.from(searchSuggestions.querySelectorAll(".search-suggestion"));

    suggestionButtons.forEach((button, index) => {
      const isActive = index === nextIndex;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", isActive ? "true" : "false");
      if (isActive) {
        button.scrollIntoView({ block: "nearest" });
        searchInput?.setAttribute("aria-activedescendant", button.id);
      }
    });

    if (nextIndex < 0 && searchInput) {
      searchInput.removeAttribute("aria-activedescendant");
    }

    activeSuggestionIndex = nextIndex;
  };

  const getSuggestionMatches = (query) => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return [];
    }

    return searchItems
      .map((item) => {
        let score = 0;

        if (item.title.toLowerCase() === normalizedQuery) {
          score += 120;
        }

        if (item.title.toLowerCase().startsWith(normalizedQuery)) {
          score += 80;
        }

        if (item.haystack.includes(normalizedQuery)) {
          score += 40;
        }

        const words = normalizedQuery.split(/\s+/).filter(Boolean);
        words.forEach((word) => {
          if (item.haystack.includes(word)) {
            score += 10;
          }
        });

        return { ...item, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
  };

  const renderSuggestions = (query) => {
    if (!searchSuggestions || !searchInput) return;

    const matches = getSuggestionMatches(query);

    if (matches.length === 0) {
      clearSuggestions();
      return;
    }

    searchSuggestions.innerHTML = matches
      .map(
        (item, index) => `
          <button
            id="${item.id}"
            class="search-suggestion"
            type="button"
            role="option"
            data-index="${index}"
            data-href="${item.href}"
            data-title="${item.title}"
            aria-selected="false"
          >
            <strong>${item.title}</strong>
            <small>${item.sectionLabel}</small>
          </button>
        `
      )
      .join("");

    searchSuggestions.hidden = false;
    searchInput.setAttribute("aria-expanded", "true");
    setActiveSuggestion(-1);
  };

  const runSearch = (query) => {
    const normalizedQuery = query.trim().toLowerCase();
    let visibleCount = 0;
    let firstMatch = null;

    searchableCards.forEach((card) => {
      const haystack = `${card.textContent} ${card.dataset.search || ""}`.toLowerCase();
      const isMatch = !normalizedQuery || haystack.includes(normalizedQuery);

      card.classList.toggle("hidden", !isMatch);

      if (isMatch) {
        visibleCount += 1;
        if (!firstMatch) {
          firstMatch = card;
        }
      }
    });

    if (searchEmptyMessage) {
      searchEmptyMessage.hidden = visibleCount !== 0;
    }

    if (firstMatch) {
      firstMatch.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  if (searchForm && searchInput && searchableCards.length > 0) {
    searchInput.addEventListener("input", () => {
      renderSuggestions(searchInput.value);
    });

    searchInput.addEventListener("focus", () => {
      if (searchInput.value.trim()) {
        renderSuggestions(searchInput.value);
      }
    });

    searchInput.addEventListener("keydown", (event) => {
      if (!searchSuggestions || searchSuggestions.hidden) {
        return;
      }

      const suggestionButtons = Array.from(searchSuggestions.querySelectorAll(".search-suggestion"));

      if (suggestionButtons.length === 0) {
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        const nextIndex = activeSuggestionIndex >= suggestionButtons.length - 1 ? 0 : activeSuggestionIndex + 1;
        setActiveSuggestion(nextIndex);
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        const nextIndex = activeSuggestionIndex <= 0 ? suggestionButtons.length - 1 : activeSuggestionIndex - 1;
        setActiveSuggestion(nextIndex);
      }

      if (event.key === "Enter" && activeSuggestionIndex >= 0) {
        event.preventDefault();
        suggestionButtons[activeSuggestionIndex].click();
      }

      if (event.key === "Escape") {
        clearSuggestions();
      }
    });

    searchForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const suggestionButtons = searchSuggestions
        ? Array.from(searchSuggestions.querySelectorAll(".search-suggestion"))
        : [];

      if (activeSuggestionIndex >= 0 && suggestionButtons[activeSuggestionIndex]) {
        suggestionButtons[activeSuggestionIndex].click();
        return;
      }

      clearSuggestions();
      runSearch(searchInput.value);
    });
  }

  if (searchSuggestions) {
    searchSuggestions.addEventListener("click", (event) => {
      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      const suggestionButton = target.closest(".search-suggestion");

      if (!(suggestionButton instanceof HTMLButtonElement)) {
        return;
      }

      const selectedTitle = suggestionButton.dataset.title || "";
      const selectedHref = suggestionButton.dataset.href || "#";

      if (searchInput) {
        searchInput.value = selectedTitle;
      }

      clearSuggestions();
      window.location.href = selectedHref;
    });
  }

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Node)) {
      return;
    }

    if (
      searchForm &&
      searchSuggestions &&
      !searchForm.contains(event.target) &&
      !searchSuggestions.contains(event.target)
    ) {
      clearSuggestions();
    }
  });

  if (feedbackButton) {
    feedbackButton.addEventListener("click", () => {
      const feedbackSection = document.getElementById("feedback");
      if (feedbackSection) {
        feedbackSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }

  if (!questionForm || !questionInput || !statusMessage) return;

  questionForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const message = questionInput.value.trim();

    if (!message) {
      statusMessage.textContent = "Please type a question first.";
      statusMessage.dataset.state = "error";
      return;
    }

    statusMessage.textContent = "Sending...";
    statusMessage.dataset.state = "";
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      const payload = new URLSearchParams({
        question: message,
        page_url: window.location.href
      });

      const response = await fetch(SCRIPT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
        },
        body: payload.toString(),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const rawText = await response.text();
      clearTimeout(timeoutId);

      let result;
      try {
        result = JSON.parse(rawText);
      } catch (parseError) {
        // Some Apps Script responses are plain text or empty even when the row is saved.
        result = { success: true };
      }

      if (result.success) {
        statusMessage.textContent = "Question sent successfully.";
        statusMessage.dataset.state = "success";
        questionInput.value = "";
      } else {
        statusMessage.textContent = result.message || "Could not send the question.";
        statusMessage.dataset.state = "error";
      }
    } catch (error) {
      console.error("Submit error:", error);
      clearTimeout(timeoutId);
      statusMessage.textContent =
        error.name === "AbortError"
          ? "The request took too long. Please try again."
          : "Could not send question right now. Please try again in a moment.";
      statusMessage.dataset.state = "error";
    }
  });
});
