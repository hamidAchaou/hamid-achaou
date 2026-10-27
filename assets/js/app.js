/**
 * Portfolio interactions.
 * Progressive enhancement: navigation, contact links, and CV download remain usable
 * without JavaScript; dynamic project content requires data/projects.json.
 */
(() => {
  "use strict";

  const SELECTORS = {
    menuButton: "#menu-icon",
    mobileNav: "#mobileNav",
    projectsContainer: "#projectsContainer",
    filterGroup: "#filterGroup",
    modal: "#projectModal",
    modalBody: "#modalBodyContent",
    contactForm: "#contactForm",
    submitButton: "#submitBtn",
    formStatus: "#formStatus",
    typedText: "#typedElement",
    currentYear: "#currentYear",
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  document.addEventListener("DOMContentLoaded", () => {
    initializeNavigation();
    initializeActiveNavigation();
    initializeTypingEffect();
    initializeProjects();
    initializeContactForm();
    initializeCurrentYear();
  });

  function initializeNavigation() {
    const menuButton = $(SELECTORS.menuButton);
    const mobileNav = $(SELECTORS.mobileNav);

    if (!menuButton || !mobileNav) return;

    const setMenuOpen = (isOpen) => {
      menuButton.setAttribute("aria-expanded", String(isOpen));
      menuButton.setAttribute("aria-label", isOpen ? "Close navigation menu" : "Open navigation menu");
      mobileNav.classList.toggle("active", isOpen);
      document.body.classList.toggle("menu-open", isOpen);
    };

    menuButton.addEventListener("click", () => {
      setMenuOpen(menuButton.getAttribute("aria-expanded") !== "true");
    });

    mobileNav.addEventListener("click", (event) => {
      if (event.target.closest("a")) setMenuOpen(false);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 768) setMenuOpen(false);
    }, { passive: true });
  }

  function initializeActiveNavigation() {
    const sections = $$("main section[id]");
    const navLinks = $$('header nav a[href^="#"], #mobileNav a[href^="#"]');
    if (!sections.length || !navLinks.length || !("IntersectionObserver" in window)) return;

    const linksByTarget = new Map();
    navLinks.forEach((link) => {
      const target = link.getAttribute("href");
      if (!linksByTarget.has(target)) linksByTarget.set(target, []);
      linksByTarget.get(target).push(link);
    });

    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;

      navLinks.forEach((link) => {
        const active = link.getAttribute("href") === `#${visible.target.id}`;
        link.classList.toggle("active", active);
        if (active) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
    }, { rootMargin: "-25% 0px -60% 0px", threshold: [0, 0.15, 0.4] });

    sections.forEach((section) => observer.observe(section));
  }

  function initializeTypingEffect() {
    const element = $(SELECTORS.typedText);
    if (!element) return;

    const roles = [
      "React & Laravel Developer",
      "Symfony Developer",
      "WordPress & CMS Developer",
      "Full Stack Developer",
    ];

    if (reduceMotion.matches) {
      element.textContent = roles[0];
      return;
    }

    let roleIndex = 0;
    let characterIndex = 0;
    let deleting = false;
    let timeoutId;

    const tick = () => {
      const role = roles[roleIndex];

      if (deleting) characterIndex -= 1;
      else characterIndex += 1;

      element.textContent = role.slice(0, characterIndex);

      let delay = deleting ? 45 : 85;
      if (!deleting && characterIndex >= role.length) {
        deleting = true;
        delay = 1800;
      } else if (deleting && characterIndex <= 0) {
        deleting = false;
        roleIndex = (roleIndex + 1) % roles.length;
        delay = 350;
      }

      timeoutId = window.setTimeout(tick, delay);
    };

    timeoutId = window.setTimeout(tick, 250);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) window.clearTimeout(timeoutId);
      else if (!reduceMotion.matches) timeoutId = window.setTimeout(tick, 300);
    });
  }

  function initializeProjects() {
    const container = $(SELECTORS.projectsContainer);
    const filterGroup = $(SELECTORS.filterGroup);
    const modal = $(SELECTORS.modal);
    const modalBody = $(SELECTORS.modalBody);

    if (!container || !filterGroup || !modal || !modalBody) return;

    const modalTitle = $("#modalTitle");
    const closeButton = $(".close", modal);
    let projects = [];
    let previouslyFocusedElement = null;

    const setStatus = (message, state = "info") => {
      container.replaceChildren();
      container.setAttribute("aria-busy", "false");
      const status = document.createElement("p");
      status.className = "status-message";
      status.dataset.state = state;
      status.setAttribute("role", state === "error" ? "alert" : "status");
      status.textContent = message;
      container.append(status);
    };

    const createProjectCard = (project) => {
      const card = document.createElement("article");
      card.className = "project-card";
      card.dataset.category = validText(project.category) || "web";

      const openButton = document.createElement("button");
      openButton.className = "project-open";
      openButton.type = "button";
      openButton.setAttribute("aria-label", `View project: ${validText(project.title) || "Untitled project"}`);
      openButton.addEventListener("click", () => openProject(project));

      const imageWrapper = document.createElement("div");
      imageWrapper.className = "project-img";
      const image = document.createElement("img");
      const imageUrl = safeResourceUrl(project.image, true);
      if (imageUrl) image.src = imageUrl;
      image.alt = validText(project.imageAlt) || `${validText(project.title) || "Project"} preview`;
      image.loading = "lazy";
      image.decoding = "async";
      image.width = 640;
      image.height = 360;
      image.addEventListener("error", () => {
        image.removeAttribute("src");
        image.alt = "Project preview unavailable";
        imageWrapper.classList.add("image-unavailable");
      }, { once: true });
      imageWrapper.append(image);

      const info = document.createElement("div");
      info.className = "project-info";

      const title = document.createElement("h3");
      title.textContent = validText(project.title) || "Untitled project";

      const tags = document.createElement("div");
      tags.className = "project-tags";
      (Array.isArray(project.technologies) ? project.technologies : [])
        .filter((tech) => validText(tech))
        .slice(0, 4)
        .forEach((tech) => {
          const tag = document.createElement("span");
          tag.className = "tag";
          tag.textContent = tech;
          tags.append(tag);
        });

      const description = document.createElement("p");
      const fullDescription = validText(project.description) || "Project details are not available.";
      description.textContent = fullDescription.length > 120
        ? `${fullDescription.slice(0, 117).trimEnd()}…`
        : fullDescription;

      info.append(title, tags, description);
      openButton.append(imageWrapper, info);
      card.append(openButton);
      return card;
    };

    const renderProjects = (category = "all") => {
      const filteredProjects = category === "all"
        ? projects
        : projects.filter((project) => project.category === category);

      container.replaceChildren();
      container.setAttribute("aria-busy", "false");

      if (!filteredProjects.length) {
        setStatus("No projects found in this category.");
        return;
      }

      const fragment = document.createDocumentFragment();
      filteredProjects.forEach((project) => fragment.append(createProjectCard(project)));
      container.append(fragment);
    };

    const closeModal = () => {
      modal.hidden = true;
      document.body.classList.remove("modal-open");
      if (previouslyFocusedElement instanceof HTMLElement) previouslyFocusedElement.focus();
    };

    const addExternalLink = (parent, url, label, className) => {
      const safeUrl = safeExternalUrl(url);
      if (!safeUrl) return;

      const link = document.createElement("a");
      link.className = `btn ${className || ""}`.trim();
      link.href = safeUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = label;
      parent.append(link);
    };

    const openProject = (project) => {
      previouslyFocusedElement = document.activeElement;
      modalBody.replaceChildren();

      if (modalTitle) modalTitle.textContent = validText(project.title) || "Project details";

      const imageColumn = document.createElement("div");
      imageColumn.className = "modal-project-image";
      const image = document.createElement("img");
      const imageUrl = safeResourceUrl(project.image, true);
      if (imageUrl) image.src = imageUrl;
      image.alt = validText(project.imageAlt) || `${validText(project.title) || "Project"} preview`;
      image.loading = "lazy";
      image.addEventListener("error", () => image.removeAttribute("src"), { once: true });
      imageColumn.append(image);

      const details = document.createElement("div");
      details.className = "modal-project-details";

      const title = document.createElement("h2");
      title.textContent = validText(project.title) || "Project details";
      const description = document.createElement("p");
      description.textContent = validText(project.description) || "No description available.";
      const techHeading = document.createElement("h3");
      techHeading.textContent = "Technologies";
      const techList = document.createElement("ul");
      techList.className = "modal-tech-list";

      (Array.isArray(project.technologies) ? project.technologies : [])
        .filter((tech) => validText(tech))
        .forEach((tech) => {
          const item = document.createElement("li");
          item.textContent = tech;
          techList.append(item);
        });

      const links = document.createElement("div");
      links.className = "modal-project-links";
      addExternalLink(links, project.github, "View source code", "btn-outline");
      addExternalLink(links, project.liveDemo, "Live demo", "");
      addExternalLink(links, project.report, "Project report", "btn-outline");

      details.append(title, description);
      if (techList.childElementCount) details.append(techHeading, techList);
      if (links.childElementCount) details.append(links);
      modalBody.append(imageColumn, details);

      modal.hidden = false;
      document.body.classList.add("modal-open");
      if (closeButton) closeButton.focus();
    };

    const closeIfBackdrop = (event) => {
      if (event.target === modal) closeModal();
    };

    filterGroup.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-filter]");
      if (!button || !filterGroup.contains(button)) return;

      $$(".filter-btn", filterGroup).forEach((filterButton) => {
        const active = filterButton === button;
        filterButton.classList.toggle("active", active);
        filterButton.setAttribute("aria-pressed", String(active));
      });
      renderProjects(button.dataset.filter || "all");
    });

    if (closeButton) closeButton.addEventListener("click", closeModal);
    modal.addEventListener("click", closeIfBackdrop);
    document.addEventListener("keydown", (event) => {
      if (modal.hidden) return;
      if (event.key === "Escape") {
        event.preventDefault();
        closeModal();
      } else if (event.key === "Tab") {
        const focusable = $$('a[href], button:not(:disabled), input:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])', modal)
          .filter((element) => element.getClientRects().length > 0);
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    });

    fetch("data/projects.json", { headers: { Accept: "application/json" } })
      .then((response) => {
        if (!response.ok) throw new Error(`Projects request failed (${response.status}).`);
        return response.json();
      })
      .then((data) => {
        const collection = Array.isArray(data) ? data : data?.projects;
        if (!Array.isArray(collection)) throw new TypeError("The projects file must contain a projects array.");
        projects = collection.filter((project) => project && typeof project === "object");
        renderProjects("all");
      })
      .catch((error) => {
        console.error("Unable to load portfolio projects:", error);
        setStatus("Projects could not be loaded. Please try again later or contact me directly.", "error");
      });
  }

  function initializeContactForm() {
    const form = $(SELECTORS.contactForm);
    const submitButton = $(SELECTORS.submitButton);
    const status = $(SELECTORS.formStatus);
    if (!form || !submitButton) return;

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;

      const originalButtonContent = submitButton.innerHTML;
      submitButton.disabled = true;
      submitButton.setAttribute("aria-busy", "true");
      submitButton.textContent = "Sending…";
      if (status) {
        status.textContent = "Sending your message…";
        status.dataset.state = "info";
      }

      try {
        const response = await fetch(form.action, {
          method: "POST",
          body: new FormData(form),
          headers: { Accept: "application/json" },
        });

        if (!response.ok) throw new Error(`Contact form request failed (${response.status}).`);
        form.reset();
        if (status) {
          status.textContent = "Thank you! Your message was sent. I will get back to you as soon as possible.";
          status.dataset.state = "success";
        }
      } catch (error) {
        console.error("Unable to submit contact form:", error);
        if (status) {
          status.textContent = "Your message could not be sent. Please email hamidachaou379@gmail.com directly.";
          status.dataset.state = "error";
        }
      } finally {
        submitButton.disabled = false;
        submitButton.removeAttribute("aria-busy");
        submitButton.innerHTML = originalButtonContent;
      }
    });
  }

  function initializeCurrentYear() {
    const element = $(SELECTORS.currentYear);
    if (element) element.textContent = String(new Date().getFullYear());
  }

  function validText(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function safeExternalUrl(value) {
    if (typeof value !== "string" || !value.trim()) return "";
    try {
      const url = new URL(value, window.location.href);
      return ["https:", "http:"].includes(url.protocol) ? url.href : "";
    } catch {
      return "";
    }
  }

  function safeResourceUrl(value, allowRelative = false) {
    if (typeof value !== "string" || !value.trim()) return "";
    const input = value.trim();
    if (allowRelative && !/^[a-z][a-z\d+.-]*:/i.test(input) && !input.startsWith("//")) {
      return input;
    }
    return safeExternalUrl(input);
  }
})();
